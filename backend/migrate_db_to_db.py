import os
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Import your NEW models
from models.costs import CategoryModel, DescriptionModel, CostModel
from models.customers import CustomerModel
from models.suppliers import SupplierModel, LoadingAddressModel
from models.company import MyCompanyModel
from models.entries import EntryModel, EntryProductsModel

# Force Python to load your .env file
load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")

# --- 1. LEGACY DB CONNECTION (Reading from legacy_db on localhost) ---
LEGACY_DB_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:5432/legacy_db"
legacy_engine = create_engine(LEGACY_DB_URL)

# --- 2. NEW DB CONNECTION (Writing to eco_core on localhost) ---
NEW_DB_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:5432/{POSTGRES_DB}"
new_engine = create_engine(NEW_DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=new_engine)


def run_migration():
    new_db = SessionLocal()

    id_maps = {
        "companies": {}, "customers": {}, "suppliers": {},
        "loading_addresses": {}, "categories": {}, "descriptions": {}, "entries": {}
    }

    try:
        print("🚀 Starting full direct DB-to-DB migration...")

        with legacy_engine.connect() as old_db:

            # ==========================================
            # STEP 1: INDEPENDENT PARENT TABLES
            # ==========================================

            # 1A. Companies
            old_companies = old_db.execute(text("""
                SELECT id, name, address, postcode, city, nation, telephone, email, btw, kvk, iban, is_active 
                FROM mycompany_mycompanymodel
            """)).mappings().all()
            for row in old_companies:
                new_id = uuid.uuid4()
                id_maps["companies"][row['id']] = new_id
                new_db.add(MyCompanyModel(
                    id=new_id,
                    name=row['name'],
                    address=row['address'],
                    postcode=row['postcode'],
                    city=row['city'],
                    nation=row['nation'],
                    telephone=row['telephone'], # Or 'phone' depending on your new model
                    email=row['email'],
                    btw=row['btw'],
                    kvk=row['kvk'],
                    iban=row['iban'],
                    is_active=row['is_active']
                ))
            print(f"✅ Companies: {len(id_maps['companies'])}")

            # 1B. Customers
            old_customers = old_db.execute(text("""
                SELECT id, name, address, postcode, city, nation, phone, email, btw, kvk, bankaccountname, iban, is_active 
                FROM customers_customermodel
            """)).mappings().all()
            for row in old_customers:
                new_id = uuid.uuid4()
                id_maps["customers"][row['id']] = new_id
                new_db.add(CustomerModel(
                    id=new_id,
                    name=row['name'],
                    address=row['address'],
                    postcode=row['postcode'],
                    city=row['city'],
                    nation=row['nation'],
                    phone=row['phone'],
                    email=row['email'],
                    btw=row['btw'],
                    kvk=row['kvk'],
                    bankaccountname=row['bankaccountname'],
                    iban=row['iban'],
                    is_active=row['is_active']
                ))
            print(f"✅ Customers: {len(id_maps['customers'])}")

            # 1C. Suppliers
            old_suppliers = old_db.execute(text("""
                SELECT id, name, address, postcode, city, nation, phone, email, btw, kvk, bankaccountname, iban, is_active 
                FROM suppliers_suppliermodel
            """)).mappings().all()
            for row in old_suppliers:
                new_id = uuid.uuid4()
                id_maps["suppliers"][row['id']] = new_id
                new_db.add(SupplierModel(
                    id=new_id,
                    name=row['name'],
                    address=row['address'],
                    postcode=row['postcode'],
                    city=row['city'],
                    nation=row['nation'],
                    phone=row['phone'],
                    email=row['email'],
                    btw=row['btw'],
                    kvk=row['kvk'],
                    bankaccountname=row['bankaccountname'],
                    iban=row['iban'],
                    is_active=row['is_active']
                ))
            print(f"✅ Suppliers: {len(id_maps['suppliers'])}")

            # 1D. Categories
            old_categories = old_db.execute(text("SELECT id, category FROM costs_categorymodel")).mappings().all()
            for row in old_categories:
                new_id = uuid.uuid4()
                id_maps["categories"][row['id']] = new_id
                new_db.add(CategoryModel(id=new_id, category=row['category']))
            print(f"✅ Categories: {len(id_maps['categories'])}")

            new_db.flush()

            # ==========================================
            # STEP 2: DEPENDENT TABLES (LEVEL 1)
            # ==========================================

            # 2A. Loading Addresses
            old_addresses = old_db.execute(text("""
                SELECT id, supplier_id_id, address, postcode, city, nation 
                FROM suppliers_loadingaddressmodel
            """)).mappings().all()
            for row in old_addresses:
                new_id = uuid.uuid4()
                id_maps["loading_addresses"][row['id']] = new_id
                new_db.add(LoadingAddressModel(
                    id=new_id,
                    supplier_id=id_maps["suppliers"].get(row['supplier_id_id']),
                    address=row['address'],
                    postcode=row['postcode'],
                    city=row['city'],
                    nation=row['nation']
                ))
            print(f"✅ Loading Addresses: {len(id_maps['loading_addresses'])}")

            # 2B. Descriptions
            old_descriptions = old_db.execute(text('SELECT id, "categoryID_id", description FROM costs_descriptionmodel')).mappings().all()
            for row in old_descriptions:
                new_id = uuid.uuid4()
                id_maps["descriptions"][row['id']] = new_id
                new_db.add(DescriptionModel(
                    id=new_id,
                    category_id=id_maps["categories"].get(row['categoryID_id']),
                    description=row['description']
                ))
            print(f"✅ Descriptions: {len(id_maps['descriptions'])}")

            new_db.flush()

            # ==========================================
            # STEP 3: HIGHLY DEPENDENT TABLES (LEVEL 2)
            # ==========================================

            # 3A. Costs
            old_costs = old_db.execute(text("""
                SELECT id, cost_date, euro_amount, is_credit, cost_note, category_id_id, description_id_id, 
                       ai_summary, file_name, invoice_nmb, quarter_reference, supplier, amount_btw, 
                       amount_no_btw, btw_percent, is_archived, year_reference
                FROM costs_costmodel
            """)).mappings().all()

            for row in old_costs:
                new_db.add(CostModel(
                    id=uuid.uuid4(),
                    cost_date=row['cost_date'],
                    category_id=id_maps["categories"].get(row['category_id_id']),
                    description_id=id_maps["descriptions"].get(row['description_id_id']),
                    euro_amount=row['euro_amount'],
                    is_credit=row['is_credit'],
                    cost_note=row['cost_note'],
                    ai_summary=row['ai_summary'],
                    file_name=row['file_name'],
                    invoice_nmb=row['invoice_nmb'],
                    quarter_reference=row['quarter_reference'],
                    supplier=row['supplier'],
                    amount_btw=row['amount_btw'],
                    amount_no_btw=row['amount_no_btw'],
                    btw_percent=row['btw_percent'],
                    is_archived=row['is_archived'],
                    year_reference=row['year_reference']
                ))
            print(f"✅ Costs: {len(old_costs)}")

            # 3B. Entries
            old_entries = old_db.execute(text("""
                SELECT id, date, overdue_date, quotation_reference, invoice_reference, is_invoice, 
                       is_commission, is_quotation, is_paid, pallets_quantity, pallets_price, 
                       pallets_total_price, pallets_notes, transport_gross, transport_bereken, 
                       transport_price_for_ton, transport_diesel_toeslag, transport_extra_stop, 
                       transport_extra_stop_cost, transport_total_no_btw, transport_total_btw, 
                       temp_no_btw_total, no_btw_total, btw_total, discount, btw_total_discount, 
                       final_total, loading_info, notes, company_id_id, customer_id_id, 
                       loading_address_id, supplier_id_id, is_archived, quarter_reference, year_reference
                FROM entries_entrymodel
            """)).mappings().all()

            for row in old_entries:
                new_id = uuid.uuid4()
                id_maps["entries"][row['id']] = new_id
                new_db.add(EntryModel(
                    id=new_id,
                    date=row['date'],
                    overdue_date=row['overdue_date'],
                    quotation_reference=row['quotation_reference'],
                    invoice_reference=row['invoice_reference'],
                    is_invoice=row['is_invoice'],
                    is_commission=row['is_commission'],
                    is_quotation=row['is_quotation'],
                    is_paid=row['is_paid'],
                    pallets_quantity=row['pallets_quantity'],
                    pallets_price=row['pallets_price'],
                    pallets_total_price=row['pallets_total_price'],
                    pallets_notes=row['pallets_notes'],
                    transport_gross=row['transport_gross'],
                    transport_bereken=row['transport_bereken'],
                    transport_price_for_ton=row['transport_price_for_ton'],
                    transport_diesel_toeslag=row['transport_diesel_toeslag'],
                    transport_extra_stop=row['transport_extra_stop'],
                    transport_extra_stop_cost=row['transport_extra_stop_cost'],
                    transport_total_no_btw=row['transport_total_no_btw'],
                    transport_total_btw=row['transport_total_btw'],
                    temp_no_btw_total=row['temp_no_btw_total'],
                    no_btw_total=row['no_btw_total'],
                    btw_total=row['btw_total'],
                    discount=row['discount'],
                    btw_total_discount=row['btw_total_discount'],
                    final_total=row['final_total'],
                    loading_info=row['loading_info'],
                    notes=row['notes'],
                    company_id=id_maps["companies"].get(row['company_id_id']),
                    customer_id=id_maps["customers"].get(row['customer_id_id']),
                    supplier_id=id_maps["suppliers"].get(row['supplier_id_id']),
                    loading_address=id_maps["loading_addresses"].get(row['loading_address_id']),
                    is_archived=row['is_archived'],
                    quarter_reference=row['quarter_reference'],
                    year_reference=row['year_reference']
                ))
            print(f"✅ Entries: {len(old_entries)}")

            new_db.flush()

            # ==========================================
            # STEP 4: GRANDCHILD TABLES (LEVEL 3)
            # ==========================================

            # 4A. Entry Products
            old_products = old_db.execute(text("""
                SELECT id, name, description, quantity, unity, unity_price, discount, total, entry_id_id 
                FROM entries_entryproductsmodel
            """)).mappings().all()

            for row in old_products:
                # Convert the old lowercase string to uppercase to match the new ENUM
                safe_unity = row['unity'].upper() if row['unity'] else "ST"

                new_db.add(EntryProductsModel(
                    id=uuid.uuid4(),
                    entry_id=id_maps["entries"].get(row['entry_id_id']),
                    name=row['name'],
                    description=row['description'],
                    quantity=row['quantity'],
                    unity=safe_unity,
                    unity_price=row['unity_price'],
                    discount=row['discount'] or 0,
                    total=row['total']
                ))
            print(f"✅ Entry Products: {len(old_products)}")

        new_db.commit()
        print("🎉 DB-to-DB Full Migration completed successfully!")

    except Exception as e:
        new_db.rollback()
        print(f"❌ Migration failed! New database rolled back safely. Error: {e}")
    finally:
        new_db.close()


if __name__ == "__main__":
    run_migration()