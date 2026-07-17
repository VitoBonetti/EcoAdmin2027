from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, String, case
from datetime import datetime

from database import get_db
from middleware import auth
from models.entries import EntryModel
from models.costs import CostModel, CategoryModel
from models.customers import CustomerModel
from models.suppliers import SupplierModel

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
        year: str = Query("All"),
        quarter: str = Query("All"),
        db: Session = Depends(get_db),
        current_user: dict = Depends(auth.get_token_from_cookie)
):
    today = datetime.now().date()

    entries_q = db.query(EntryModel)
    costs_q = db.query(CostModel)

    # --- BULLETPROOF FILTERING ---
    # We cast columns to String to prevent any DB type-mismatch crashes
    if year != "All":
        year_str = str(year)
        entries_q = entries_q.filter(func.cast(EntryModel.year_reference, String) == year_str)
        costs_q = costs_q.filter(func.cast(CostModel.year_reference, String) == year_str)

    if quarter != "All":
        quarter_str = str(quarter)
        # Check both "1" and "Q1" just in case your tables format them differently
        entries_q = entries_q.filter(
            func.cast(EntryModel.quarter_reference, String).in_([quarter_str, f"Q{quarter_str}"]))
        costs_q = costs_q.filter(func.cast(CostModel.quarter_reference, String).in_([quarter_str, f"Q{quarter_str}"]))

    # --- ROW 1: KPI Cards ---
    total_customers = db.query(CustomerModel).count()
    total_suppliers = db.query(SupplierModel).count()

    open_invoices_count = entries_q.filter(
        EntryModel.is_paid == False, EntryModel.is_quotation == False
    ).count()

    quotations_count = entries_q.filter(EntryModel.is_quotation == True).count()

    total_expenses = costs_q.filter(CostModel.is_credit == False).with_entities(
        func.sum(CostModel.euro_amount)).scalar() or 0.0
    total_credits = costs_q.filter(CostModel.is_credit == True).with_entities(
        func.sum(CostModel.euro_amount)).scalar() or 0.0
    net_total_costs = float(total_credits) - float(total_expenses)

    # --- ROW 2: Horizontal Bars Data ---
    paid_count = entries_q.filter(EntryModel.is_quotation == False, EntryModel.is_paid == True).count()
    overdue_count = entries_q.filter(EntryModel.is_quotation == False, EntryModel.is_paid == False,
                                     EntryModel.overdue_date < today).count()
    open_count = entries_q.filter(EntryModel.is_quotation == False, EntryModel.is_paid == False,
                                  EntryModel.overdue_date >= today).count()

    invoice_status_bar = [{"name": "Invoices", "Paid": paid_count, "Open": open_count, "Overdue": overdue_count}]
    cost_diverging_bar = [{"name": "Cashflow", "Income": float(total_credits), "Expense": -float(total_expenses)}]

    # --- ROW 3: Charts Data ---
    # Costs by Category (Now handles BOTH Credits and Debits properly)
    costs_by_category_query = db.query(
        CategoryModel.category,
        func.count(CostModel.id).label("total")
    ).join(CostModel, CostModel.category_id == CategoryModel.id)

    # Apply the same bulletproof filtering
    if year != "All":
        costs_by_category_query = costs_by_category_query.filter(
            func.cast(CostModel.year_reference, String) == str(year))
    if quarter != "All":
        costs_by_category_query = costs_by_category_query.filter(
            func.cast(CostModel.quarter_reference, String).in_([str(quarter), f"Q{quarter}"]))

    costs_by_category_query = costs_by_category_query.group_by(CategoryModel.category).all()
    costs_by_category = [{"name": row.category, "value": int(row.total)} for row in costs_by_category_query]

    invoices_per_quarter_query = entries_q.filter(
        EntryModel.is_quotation == False
    ).with_entities(
        EntryModel.quarter_reference, func.count(EntryModel.id).label("count")
    ).group_by(EntryModel.quarter_reference).order_by(EntryModel.quarter_reference).all()

    invoices_per_quarter = [{"quarter": row.quarter_reference or "Unknown", "count": row.count} for row in
                            invoices_per_quarter_query]

    # --- ROW 4: Action Lists ---
    open_invoices_list = entries_q.filter(
        EntryModel.is_paid == False, EntryModel.is_quotation == False
    ).order_by(EntryModel.overdue_date.asc()).limit(15).all()

    quotations_list = entries_q.filter(EntryModel.is_quotation == True).order_by(EntryModel.overdue_date.asc()).limit(
        15).all()

    return {
        "kpis": {
            "customers": total_customers,
            "suppliers": total_suppliers,
            "open_invoices": open_invoices_count,
            "quotations": quotations_count,
            "total_costs": net_total_costs
        },
        "charts": {
            "invoice_status_bar": invoice_status_bar,
            "cost_diverging_bar": cost_diverging_bar,
            "costs_by_category": costs_by_category,
            "invoices_per_quarter": invoices_per_quarter
        },
        "lists": {
            "open_invoices": [
                {
                    "id": str(inv.id),
                    "reference": inv.invoice_reference or "Draft",
                    "total": float(inv.final_total),
                    "overdue_date": inv.overdue_date,
                    "is_overdue": inv.overdue_date < today if inv.overdue_date else False,
                    "is_commission": inv.is_commission
                } for inv in open_invoices_list
            ],
            "quotations": [
                {
                    "id": str(q.id),
                    "reference": q.quotation_reference or "Draft",
                    "total": float(q.final_total),
                    "overdue_date": q.overdue_date,
                    "is_overdue": q.overdue_date < today if q.overdue_date else False
                } for q in quotations_list
            ]
        }
    }