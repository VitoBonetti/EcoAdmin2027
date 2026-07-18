from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, not_, String
from decimal import Decimal, ROUND_HALF_UP
from typing import List

from database import get_db
from middleware.auth import get_current_user
from models.entries import EntryModel
from models.costs import CostModel, CategoryModel, DescriptionModel

router = APIRouter(
    prefix="/taxes",
    tags=["Taxes"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/years")
def get_tax_years(db: Session = Depends(get_db)):
    """Returns a list of distinct years present in the EntryModel."""
    years = db.query(EntryModel.year_reference).filter(
        EntryModel.year_reference.isnot(None)
    ).distinct().order_by(EntryModel.year_reference).all()

    return [year[0] for year in years]


@router.get("/quarters")
def get_tax_quarters():
    """Returns the static list of quarters."""
    return [
        {"quarter": "1", "name": "Q1"},
        {"quarter": "2", "name": "Q2"},
        {"quarter": "3", "name": "Q3"},
        {"quarter": "4", "name": "Q4"},
    ]


@router.get("/calculate")
def calculate_taxes(
        year: str = Query(..., description="The year to calculate"),
        quarter: str = Query(..., description="The quarter (1, 2, 3, or 4)"),
        db: Session = Depends(get_db)
):
    # Clean inputs to handle both "1" and "Q1" gracefully
    quarter_num = quarter.replace("Q", "")
    quarter_cost_str = f"Q{quarter_num}"

    # 1. Entry Total
    entry_total = db.query(func.sum(EntryModel.final_total)).filter(
        func.cast(EntryModel.year_reference, String) == year,
        func.cast(EntryModel.quarter_reference, String) == quarter_num,
        EntryModel.is_paid == True
    ).scalar() or 0.0

    # 2. Costs Base Query (Joining Category and Description)
    costs_q = db.query(CostModel).join(CategoryModel).join(DescriptionModel).filter(
        func.cast(CostModel.year_reference, String) == year,
        func.cast(CostModel.quarter_reference, String) == quarter_cost_str
    )

    # basic_cost (Excluding Salary, Tax, and ABNAmro Credits)
    basic_cost = costs_q.filter(
        not_(and_(CategoryModel.category == "GENERAL", DescriptionModel.description == "Salary")),
        CategoryModel.category != "TAX",
        not_(and_(CategoryModel.category == "GENERAL", DescriptionModel.description == "ABNAmro",
                  CostModel.is_credit == True))
    ).with_entities(func.sum(CostModel.euro_amount)).scalar() or 0.0

    # bank_interest (Only GENERAL -> ABNAmro -> Credit)
    bank_interest = costs_q.filter(
        CategoryModel.category == "GENERAL",
        DescriptionModel.description == "ABNAmro",
        CostModel.is_credit == True
    ).with_entities(func.sum(CostModel.euro_amount)).scalar() or 0.0

    # total_salary (Only GENERAL -> Salary)
    total_salary = costs_q.filter(
        CategoryModel.category == "GENERAL",
        DescriptionModel.description == "Salary"
    ).with_entities(func.sum(CostModel.euro_amount)).scalar() or 0.0

    # total_tax (Conditional Sum: Positive if Credit, Negative if Debit)
    total_tax = costs_q.filter(
        CategoryModel.category == "TAX"
    ).with_entities(
        func.sum(
            case((CostModel.is_credit == True, CostModel.euro_amount), else_=-CostModel.euro_amount)
        )
    ).scalar() or 0.0

    # --- Convert to Decimal and Round (Replicating Django's exact logic) ---
    d_entry = Decimal(str(entry_total)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)
    d_basic = Decimal(str(basic_cost)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)
    d_bank = Decimal(str(bank_interest)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)
    d_salary = Decimal(str(total_salary)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)
    d_tax = Decimal(str(total_tax)).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)

    # --- Perform Calculations ---
    first_step = d_basic - d_bank
    second_step = first_step + d_tax
    third_step = d_entry - second_step
    tax = third_step * Decimal('0.45')
    after_tax = third_step - tax
    quarter_safe = after_tax - d_salary

    # --- Return safely formatted numbers ---
    return {
        "entry_data": float(d_entry),
        "basic_cost": float(d_basic),
        "bank_interest": float(d_bank),
        "total_salary": float(d_salary),
        "total_tax": float(d_tax),
        "first_step": float(first_step.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)),
        "second_step": float(second_step.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)),
        "third_step": float(third_step.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)),
        "tax": float(tax.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)),
        "after_tax": float(after_tax.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)),
        "quarter_safe": float(quarter_safe.quantize(Decimal('0.00'), rounding=ROUND_HALF_UP))
    }