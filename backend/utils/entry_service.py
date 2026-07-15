from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal
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
        entry_data['btw_total'] = no_btw_total
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
        last_qtn = db.query(func.max(EntryModel.quotation_reference)).filter(EntryModel.quotation_reference.startswith(f"QTN{current_year_str}")).with_for_update().scalar()
        last_qtn_number = int(last_qtn.split('-')[-1]) if last_qtn else 0
        entry_data['quotation_reference'] = f"QTN{current_year_str}-{str(last_qtn_number + 1).zfill(3)}"

    # invoice reference
    if (entry_data.get('is_invoice') or (entry_data.get('is_commission') and not entry_data.get('is_quotation'))) and not entry_data.get('invoice_reference'):
        last_inv = db.query(func.max(EntryModel.invoice_reference)).filter(EntryModel.invoice_reference.startswith(f"INV{current_year_str}")).with_for_update().scalar()
        last_inv_number = int(last_inv[8:]) if last_inv else 0
        entry_data['invoice_reference'] = f"INV{current_year_str}-{str(last_inv_number + 1).zfill(3)}"

    # save
    new_entry = EntryModel(**entry_data)
    db.add(new_entry)
    db.flush()

    for product in products_data:
        new_product = EntryProductsModel(**product, entry_id=new_entry.id)
        db.add(new_product)

    db.commit()
    db.refresh(new_entry)
    return new_entry