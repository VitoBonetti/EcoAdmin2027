import weasyprint
import io
import os
import openpyxl
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, APIRouter, Depends, status, Query, Request
from fastapi.responses import Response, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, desc, asc
from database import get_db
from schema import (
    EntryFormDataResponse,
    EntryModelCreate,
    EntryModelResponse,
    EntryDetailContextResponse,
    LoadingAddressResponse,
    EntryModelUpdate,
)
from models.entries import EntryModel, UnityChoises, EntryProductsModel
from models.suppliers import LoadingAddressModel, SupplierModel
from models.company import MyCompanyModel
from models.customers import CustomerModel
from utils.entry_service import create_entry_transaction, update_entry_transaction
from middleware.auth import get_current_user
from static.algemene import ALGEMENE_TITLE, ALGEMENE_INVOICE, ALGEMENE_OFFERTE, ALGEMENE_COMMISSION, FOOTER_TEXT

router = APIRouter(
    prefix="/entries",
    tags=["Entries"],
    dependencies=[Depends(get_current_user)],
)

current_dir = os.path.dirname(os.path.abspath(__file__))
templates_path = os.path.join(current_dir, "..", "static", "templates")
templates = Jinja2Templates(directory=templates_path)

# --- Get Entries endpoints ---
@router.get("/", response_model=List[EntryModelResponse])
def get_all_entries(db: Session = Depends(get_db)):
    # Building the filters
    today = datetime.now().date()
    overdue_unpaid_condition = and_(
        EntryModel.overdue_date < today,
        EntryModel.is_paid == False
    )
    unpaid_condition = (EntryModel.is_paid == False)

    # execute qurey
    entries = db.query(EntryModel).filter(
        EntryModel.is_archived == False
    ).order_by(
        desc(overdue_unpaid_condition),
        desc(unpaid_condition),
        asc(EntryModel.overdue_date)
    ).all()

    return entries


@router.get("/archived/", response_model=List[EntryModelResponse])
def gell_all_archived(db: Session = Depends(get_db)):
    # Building the filters
    today = datetime.now().date()
    overdue_unpaid_condition = (EntryModel.overdue_date < today)
    archived_entries = db.query(EntryModel).filter(EntryModel.is_archived == True).order_by(desc(overdue_unpaid_condition), asc(EntryModel.overdue_date)).all()

    return archived_entries


@router.get("/commissions/", response_model=List[EntryModelResponse])
def get_all_commissions(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = and_(
        EntryModel.overdue_date < today,
        EntryModel.is_paid == False
    )
    unpaid_condition = (EntryModel.is_paid == False)

    # execute qurey
    entries_commission = db.query(EntryModel).filter(
        EntryModel.is_archived == False
    ).filter(EntryModel.is_commission == True).order_by(
        desc(overdue_unpaid_condition),
        desc(unpaid_condition),
        asc(EntryModel.overdue_date)
    ).all()

    return entries_commission


@router.get("/archived/commissions/", response_model=List[EntryModelResponse])
def get_archived_commissions(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = (EntryModel.overdue_date < today)
    archived_commissions = db.query(EntryModel).filter(EntryModel.is_archived == True).filter(EntryModel.is_commission == True).order_by(desc(overdue_unpaid_condition), asc(EntryModel.overdue_date)).all()

    return archived_commissions


@router.get("/invoices/", response_model=List[EntryModelResponse])
def get_all_invoices(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = and_(
        EntryModel.overdue_date < today,
        EntryModel.is_paid == False
    )
    unpaid_condition = (EntryModel.is_paid == False)

    # execute qurey
    entries_invoices = db.query(EntryModel).filter(
        EntryModel.is_archived == False
    ).filter(EntryModel.is_invoice == True).order_by(
        desc(overdue_unpaid_condition),
        desc(unpaid_condition),
        asc(EntryModel.overdue_date)
    ).all()

    return entries_invoices


@router.get("/archived/invoices/", response_model=List[EntryModelResponse])
def get_archived_invoices(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = (EntryModel.overdue_date < today)
    archived_invoices = db.query(EntryModel).filter(EntryModel.is_archived == True).filter(
        EntryModel.is_invoice == True).order_by(desc(overdue_unpaid_condition), asc(EntryModel.overdue_date)).all()

    return archived_invoices


@router.get("/quotations/", response_model=List[EntryModelResponse])
def get_all_invoices(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = and_(
        EntryModel.overdue_date < today,
        EntryModel.is_paid == False
    )
    unpaid_condition = (EntryModel.is_paid == False)

    # execute qurey
    entries_quotations = db.query(EntryModel).filter(
        EntryModel.is_archived == False
    ).filter(EntryModel.is_quotation == True).order_by(
        desc(overdue_unpaid_condition),
        desc(unpaid_condition),
        asc(EntryModel.overdue_date)
    ).all()

    return entries_quotations


@router.get("/archived/quotations/", response_model=List[EntryModelResponse])
def get_archived_invoices(db: Session = Depends(get_db)):
    today = datetime.now().date()
    overdue_unpaid_condition = (EntryModel.overdue_date < today)
    archived_quotations = db.query(EntryModel).filter(EntryModel.is_quotation == True).filter(
        EntryModel.is_invoice == True).order_by(desc(overdue_unpaid_condition), asc(EntryModel.overdue_date)).all()

    return archived_quotations


# -- delete endpoints ---
@router.delete("/{entry_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: UUID, db: Session = Depends(get_db)):
    db_entries = db.query(EntryModel).filter(EntryModel.id == entry_id).first()
    if not db_entries:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(db_entries)
    db.commit()


# --- patch endpoints ---
@router.patch("/{entry_id}/archive-state/", response_model=EntryModelResponse)
def toggle_archive_entry(entry_id: UUID, db: Session = Depends(get_db)):
    db_entry = db.query(EntryModel).filter(EntryModel.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    db_entry.is_archived = not db_entry.is_archived
    db.commit()
    db.refresh(db_entry)
    return db_entry



# --- Create/update entries endpoints ---
@router.get("/form-options/", response_model=EntryFormDataResponse)
def get_entry_form_options(db: Session = Depends(get_db)):
    """
    give React with all the active entities needed to populate dropdowns.
    """
    companies = db.query(MyCompanyModel).filter(MyCompanyModel.is_active == True).all()
    customers = db.query(CustomerModel).filter(CustomerModel.is_active == True).all()
    suppliers = db.query(SupplierModel).filter(SupplierModel.is_active == True).all()

    return {
        "companies": companies,
        "customers": customers,
        "suppliers": suppliers
    }


@router.get("/loading_addresses/", response_model=List[LoadingAddressResponse])
def get_loading_addresses(supplier_id: Optional[UUID] = Query(None, description="Filter addresses by supplier"),db: Session = Depends(get_db)):
    base_query = db.query(LoadingAddressModel)
    if supplier_id:
        base_query = base_query.filter(LoadingAddressModel.supplier_id == supplier_id)
    addresses = base_query.all()
    return addresses


@router.get("/{entry_id}/", response_model=EntryDetailContextResponse)
def get_entry_detail(entry_id: UUID, db: Session = Depends(get_db)):
    """
    Returns the Entry, nested Products, and all calculated context data.
    """
    # Fetch Entry directly
    entry = db.query(EntryModel).filter(EntryModel.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # Fetch Products directly (Sidesteps relationship naming errors)
    products = db.query(EntryProductsModel).filter(EntryProductsModel.entry_id == entry_id).all()

    #  (str() casting prevents Float/Decimal collision errors)
    btw_calc = Decimal('0.0')
    if not entry.is_commission:
        btw_total = Decimal(str(entry.final_total)) if entry.final_total is not None else Decimal('0')
        no_btw_total = Decimal(str(entry.temp_no_btw_total)) if entry.temp_no_btw_total is not None else Decimal('0')
        btw_calc = btw_total - no_btw_total

    total_discount = Decimal('0.0')
    if entry.discount and entry.discount > 0:
        calc_btw_total = Decimal(str(entry.btw_total)) if entry.btw_total is not None else Decimal('0')
        calc_discount = Decimal(str(entry.btw_total_discount)) if entry.btw_total_discount is not None else Decimal('0')
        total_discount = calc_btw_total - calc_discount

    # construct the transport dictionary
    transport = {
        'transport_gross': entry.transport_gross,
        'transport_bereken': entry.transport_bereken,
        'transport_price_for_ton': entry.transport_price_for_ton,
        'transport_diesel_toeslag': entry.transport_diesel_toeslag,
        'transport_extra_stop': entry.transport_extra_stop,
        'transport_extra_stop_cost': entry.transport_extra_stop_cost,
        'transport_total_no_btw': entry.transport_total_no_btw
    }

    # Construct the algemene dictionary
    algemene = {
        "algemene_title": ALGEMENE_TITLE,
        "algemene_offerte": ALGEMENE_OFFERTE,
        "algemene_invoice": ALGEMENE_INVOICE,
        "algemene_commission": ALGEMENE_COMMISSION,
    }

    return {
        "entry": entry,
        "products": products, # Use the direct products query array
        "btw_calc": btw_calc,
        "total_discount": total_discount,
        "transport": transport,
        "algemene": algemene
    }



@router.post("/", response_model=EntryModelResponse, status_code=status.HTTP_201_CREATED)
def create_new_entry(payload: EntryModelCreate, db: Session = Depends(get_db)):
    if not payload.overdue_date:
        payload.overdue_date = payload.date + timedelta(days=30)
    entry_data = payload.model_dump(exclude={'products'})
    products_data = [p.model_dump(exclude={'entry_id'}) for p in payload.products]
    new_entry = create_entry_transaction(db, entry_data, products_data)
    return new_entry


@router.patch("/{entry_id}/", response_model=EntryModelResponse)
def update_entry(entry_id: UUID, payload: EntryModelUpdate, db: Session = Depends(get_db)):
    if payload.date is not None:
        payload.overdue_date = payload.date + timedelta(days=30)
    # separate the parent payload from the nested products list
    update_data = payload.model_dump(exclude_unset=True, exclude={'products'})
    # Check if products were included in the update payload
    products_data = None
    if payload.products is not None:
        products_data = [p.model_dump(exclude_unset=True, exclude={'entry_id'}) for p in payload.products]
    # pass to the service layer
    updated_entry = update_entry_transaction(db, str(entry_id), update_data, products_data)
    if not updated_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return updated_entry


# --- File creation ---
@router.get("/{entry_id}/pdf")
def download_entry_pdf(entry_id: UUID, request: Request, db: Session = Depends(get_db)):
    """
    Renders the HTML template and converts it to a downloadable PDF.
    """
    entry = db.query(EntryModel).options(joinedload(EntryModel.entry_products)).filter(EntryModel.id == entry_id).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    btw_calc = Decimal('0.0')
    if not entry.is_commission:
        btw_total = entry.final_total if entry.final_total is not None else Decimal('0')
        no_btw_total = entry.temp_no_btw_total if entry.temp_no_btw_total is not None else Decimal('0')
        btw_calc = btw_total - no_btw_total

    total_discount = Decimal('0.0')
    if entry.discount and entry.discount > 0:
        total_discount = (entry.btw_total or Decimal('0')) - (entry.btw_total_discount or Decimal('0'))

    transport = {
        'transport_gross': entry.transport_gross,
        'transport_bereken': entry.transport_bereken,
        'transport_price_for_ton': entry.transport_price_for_ton,
        'transport_diesel_toeslag': entry.transport_diesel_toeslag,
        'transport_extra_stop': entry.transport_extra_stop,
        'transport_extra_stop_cost': entry.transport_extra_stop_cost,
        'transport_total_no_btw': entry.transport_total_no_btw
    }

    algemene = {
        "algemene_title": "Your Title",
        "algemene_offerte": "Your Offerte",
        "algemene_invoice": "Your Invoice",
        "algemene_commission": "Your Commission",
        "footer_text": "Your Footer"
    }

    # Prepare context for Jinja2 (FastAPI requires the 'request' object in the context)
    context = {
        "request": request,
        "entry": entry,
        "products": entry.entry_products,
        "btw_calc": btw_calc,
        "transport": transport,
        "algemene": algemene,
        "total_discount": total_discount,
    }

    # Render the HTML to a string
    html_content = templates.TemplateResponse("invoice_pdf.html", context).body

    # Convert the HTML string to a PDF byte string using WeasyPrint
    pdf_bytes = weasyprint.HTML(string=html_content.decode('utf-8')).write_pdf()

    # Determine filename dynamically
    if entry.is_quotation and not entry.is_invoice:
        filename = f"{entry.quotation_reference}.pdf"
    else:
        filename = f"{entry.invoice_reference}.pdf"

    # Return as a downloadable file
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/export/{entry_type}")
def export_entries_excel(entry_type: str, db: Session = Depends(get_db)):
    """
    Replaces Django export_entries_excel.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Entries Export"

    headers = [
        "Invoice Ref", "Quotation Ref", "Customer/Supplier", "Date",
        "Overdue Date", "Total No BTW (€)", "Total (€)", "Type", "Is Paid"
    ]
    ws.append(headers)

    # Base query matching select_related('customer', 'supplier')
    base_query = db.query(EntryModel).options(
        joinedload(EntryModel.customer),
        joinedload(EntryModel.supplier)
    )

    # Apply filters based on entry_type
    if entry_type == 'entries':
        query = base_query.filter(EntryModel.is_archived == False)
    elif entry_type == 'quotations':
        query = base_query.filter(
            EntryModel.is_archived == False,
            EntryModel.is_quotation == True,
            EntryModel.is_invoice == False
        )
    elif entry_type == 'invoices':
        query = base_query.filter(
            EntryModel.is_archived == False,
            EntryModel.is_invoice == True,
            EntryModel.is_commission == False
        )
    elif entry_type == 'commission':
        query = base_query.filter(
            EntryModel.is_archived == False,
            EntryModel.is_commission == True
        )
    elif entry_type == 'archives':
        query = base_query.filter(EntryModel.is_archived == True)
    else:  # 'all'
        query = base_query

    # Order by date descending and execute
    entries = query.order_by(desc(EntryModel.date)).all()

    for entry in entries:
        invoice_ref = entry.invoice_reference if entry.invoice_reference else "N/A"
        quotation_ref = entry.quotation_reference if entry.quotation_reference else "N/A"

        if entry.is_commission:
            cust_sup = entry.supplier.name if entry.supplier else "N/A"
        else:
            cust_sup = entry.customer.name if entry.customer else "N/A"

        if entry.is_commission:
            type_entry = "Commission"
        elif entry.is_quotation and not entry.is_invoice:
            type_entry = "Quotation"
        else:
            type_entry = "Invoice"

        is_paid = "Paid" if entry.is_paid else "Not Paid"

        row = [
            invoice_ref,
            quotation_ref,
            cust_sup,
            entry.date,
            entry.overdue_date,
            entry.no_btw_total,
            entry.final_total,
            type_entry,
            is_paid
        ]
        ws.append(row)

    # Save workbook to an in-memory buffer instead of a physical file
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)  # Reset stream position to the beginning so it can be read

    # Generate Filename
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{entry_type}_export_{timestamp}.xlsx"

    # Stream the buffer directly to the client
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )