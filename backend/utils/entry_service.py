from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
from models.entries import EntryModel, EntryProductsModel


def calculate_entry_math(entry_data: dict, products_data: list[dict]) -> tuple[dict, list[dict]]:
    """
    Handles all the math and date logic
    """
    # total product and base sum
    no_btw_total = Decimal('0.0')
    for product in products_data:
        qty = Decimal(str(product.get('quantity', 0)))
        price = Decimal(str(product.get('unity_price', 0)))
        discount_pct = Decimal(str(product.get('discount', 0)))

        base_total = qty * price
        if discount_pct > 0:
            discount_amount = base_total * (discount_pct / Decimal('100'))
            product['total'] = base_total - discount_amount
        else:
            product['total'] = base_total

        no_btw_total += product['total']

    entry_data['no_btw_total'] = no_btw_total

    # commission logic
    if entry_data.get('is_commission'):
        entry_data['btw_total'] = Decimal('0.0')
        entry_data['final_total'] = no_btw_total
        entry_data['temp_no_btw_total'] = no_btw_total
    elif entry_data.get('is_quotation') or entry_data.get('is_invoice'):
        # Calculate transport
        t_gross = int(entry_data.get('transport_gross', 0) or 0)
        t_bereken = 1000 if 0 < t_gross <= 1000 else (0 if t_gross <= 0 else ((t_gross - 1) // 1000 + 1) * 1000)
        entry_data['transport_bereken'] = t_bereken

        # transport cost
        t_price = Decimal(str(entry_data.get('transport_price_for_ton', 0)))
        t_cost = t_price * (Decimal(t_bereken) / Decimal('1000'))
        diesel_pct = Decimal(str(entry_data.get('transport_diesel_toeslag', 0)))
        diesel_toeslag = t_cost * (diesel_pct / Decimal('100'))
        extra_stop = Decimal(str(entry_data.get('transport_extra_stop_cost', 0)))
        t_total_no_btw = t_cost + diesel_toeslag + extra_stop
        entry_data['transport_total_no_btw'] = t_total_no_btw

        # pallets
        p_qty = int(entry_data.get('pallets_quantity', 0) or 0)
        p_price = Decimal(str(entry_data.get('pallets_price', 0)))
        p_total = Decimal(p_qty) * p_price
        entry_data['pallets_total_price'] = p_total

        # Final Totals (Dutch BTW 21%)
        temp_total = t_total_no_btw + no_btw_total + p_total
        entry_data['temp_no_btw_total'] = temp_total
        entry_data['final_total'] = temp_total * Decimal('1.21')

        # date and logic for references
        entry_date = entry_data.get('date') or datetime.now().date()

        if not entry_data.get('year_reference'):
            entry_data['year_reference'] = entry_date.year

        if not entry_data.get('quarter_reference'):
            quarter = (entry_date.month - 1) // 3 + 1
            entry_data['quarter_reference'] = f"Q{quarter}"

        if not entry_data.get('overdue_date'):
            entry_data['overdue_date'] = entry_date + timedelta(days=30)

        if entry_data.get('is_paid'):
            entry_data['overdue_date'] = datetime.now().date()

        return entry_data, products_data


def create_entry_transaction(db: Session, entry_in: dict, products_in: list[dict]) -> EntryModel:
    """
    Handles the database transaction, including generating sequential reference numbers safely.
    """
    current_year_str = str(datetime.now().year)

    # run the math logic
    entry_data, products_data = calculate_entry_math(entry_in, products_in)

    # quotation reference
    if entry_data.get('is_quotation') and not entry_data.get('quotation_reference'):
        last_qtn_ref = db.query(EntryModel.quotation_reference).filter(EntryModel.quotation_reference.startswith(f"QTN{current_year_str}")).order_by(desc(EntryModel.quotation_reference)).with_for_update().first()
        last_qtn = last_qtn_ref[0] if last_qtn_ref else None
        last_qtn_number = int(last_qtn.split('-')[-1]) if last_qtn else 0
        entry_data['quotation_reference'] = f"QTN{current_year_str}-{str(last_qtn_number + 1).zfill(3)}"

    # invoice reference
    if (entry_data.get('is_invoice') or (entry_data.get('is_commission') and not entry_data.get('is_quotation'))) and not entry_data.get('invoice_reference'):
        last_inv_ref = db.query(EntryModel.invoice_reference).filter(EntryModel.invoice_reference.startswith(f"INV{current_year_str}")).order_by(desc(EntryModel.invoice_reference)).with_for_update().first()
        last_inv = last_inv_ref[0] if last_inv_ref else None
        last_inv_number = int(last_inv[8:]) if last_inv else 0
        entry_data['invoice_reference'] = f"INV{current_year_str}-{str(last_inv_number + 1).zfill(3)}"

    # save
    new_entry = EntryModel(**entry_data)
    db.add(new_entry)
    db.flush()

    for product in products_data:
        new_product = EntryProductsModel(id=uuid.uuid4(), **product, entry_id=new_entry.id)
        db.add(new_product)

    db.commit()
    db.refresh(new_entry)
    return new_entry


def update_entry_transaction(db: Session, entry_id: str, entry_in: dict, products_in: list[dict] | None) -> EntryModel:
    """
    Updates an existing entry and synchronizes its nested products.
    """
    # Fetch the existing entry
    db_entry = db.query(EntryModel).filter(EntryModel.id == entry_id).first()
    if not db_entry:
        return None

    # Update the parent entry's basic fields
    for key, value in entry_in.items():
        setattr(db_entry, key, value)

    # Handle Nested Products (if they are provided in the payload)
    if products_in is not None:
        existing_products = {str(p.id): p for p in
                             db.query(EntryProductsModel).filter(EntryProductsModel.entry_id == entry_id).all()}
        incoming_ids = set()

        # We need a unified list of product dictionaries to pass to the math function
        final_products_data = []

        for prod_data in products_in:
            prod_id = str(prod_data.get('id')) if prod_data.get('id') else None

            if prod_id and prod_id in existing_products:
                # Update existing product
                db_prod = existing_products[prod_id]
                incoming_ids.add(prod_id)

                # Apply updates to the model
                for k, v in prod_data.items():
                    if k != 'id':
                        setattr(db_prod, k, v)

                # Convert back to dict for the math calculator
                final_products_data.append({c.name: getattr(db_prod, c.name) for c in db_prod.__table__.columns})

            else:
                # It's a brand new product added during the edit
                # Remove the empty ID if it exists so SQLAlchemy generates a new one
                if 'id' in prod_data:
                    del prod_data['id']
                final_products_data.append(prod_data)

        # Delete any products that were removed in the frontend
        for old_id, old_prod in existing_products.items():
            if old_id not in incoming_ids:
                db.delete(old_prod)

        # Rerun all the math calculations using the updated/new products
        # We convert db_entry to a dictionary to pass it to our pure math function
        entry_dict = {c.name: getattr(db_entry, c.name) for c in db_entry.__table__.columns}
        updated_entry_dict, calculated_products = calculate_entry_math(entry_dict, final_products_data)

        # Apply the newly calculated totals back to the DB model
        for key in ['no_btw_total', 'btw_total', 'final_total', 'temp_no_btw_total', 'transport_total_no_btw',
                    'transport_bereken', 'pallets_total_price', 'overdue_date']:
            if key in updated_entry_dict:
                setattr(db_entry, key, updated_entry_dict[key])

        # Add the brand new products to the DB
        for calc_prod in calculated_products:
            if 'id' not in calc_prod:  # Only the newly added ones won't have IDs yet
                new_db_prod = EntryProductsModel(id=uuid.uuid4(), **calc_prod, entry_id=db_entry.id)
                db.add(new_db_prod)

    # commit the transaction
    db.commit()
    db.refresh(db_entry)
    return db_entry