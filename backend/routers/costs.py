import io
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, APIRouter, Depends, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
import openpyxl
from database import get_db
from schema import (
    CategoryModelCreate,
    CategoryModelResponse,
    CategoryModelUpdate,
    DescriptionModelResponse,
    DescriptionModelCreate,
    DescriptionModelUpdate,
    CostModelUpdate,
    CostModelResponse,
    CostModelCreate,
)
from models.costs import CategoryModel, DescriptionModel, CostModel
from middleware.auth import get_current_user

router = APIRouter(
    prefix="/api",
    tags=["Costs"],
    dependencies=[Depends(get_current_user)]
)


# Categories endpoint
# -------------------
@router.get("/categories/", response_model=List[CategoryModelResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(CategoryModel).order_by(CategoryModel.category).all()

@router.get("/categories/autocomplete/")
def autocomplete_categories(q: str = "", db: Session = Depends(get_db)):
    categories = db.query(CategoryModel).filter(CategoryModel.category.ilike(f"%{q}%")).order_by(CategoryModel.category).all()
    return [
        {
            "id": str(c.id),
            "category": c.category,
            "descriptions": [d.description for d in c.descriptions]
        }
        for c in categories
    ]

@router.post("/categories/", response_model=CategoryModelResponse, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryModelCreate, db: Session = Depends(get_db)):
    new_category = CategoryModel(**category.model_dump())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.patch("/categories/{category_id}", response_model=CategoryModelResponse)
def update_category(category_id: UUID, category_update: CategoryModelUpdate, db: Session = Depends(get_db)):
    db_category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)

    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, db: Session = Depends(get_db)):
    db_category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_category)
    db.commit()


# Descriptions endpoints
# ----------------------
@router.get("/descriptions/", response_model=List[DescriptionModelResponse])
def list_descriptions(db: Session = Depends(get_db)):
    return db.query(DescriptionModel).join(CategoryModel).order_by(
        CategoryModel.category, DescriptionModel.description
    ).all()


@router.get("/descriptions/{description_id}", response_model=DescriptionModelResponse)
def get_description(description_id: UUID, db: Session = Depends(get_db)):
    db_desc = db.query(DescriptionModel).filter(DescriptionModel.id == description_id).first()
    if not db_desc:
        raise HTTPException(status_code=404, detail="Description not found")
    return db_desc


@router.get("/categories/{category_id}/descriptions/")
def get_descriptions_by_category(category_id: UUID, q: str = "", db: Session = Depends(get_db)):
    descriptions = db.query(DescriptionModel).join(CategoryModel).filter(
        DescriptionModel.category_id == category_id,
        DescriptionModel.description.ilike(f"%{q}%")
    ).order_by(DescriptionModel.description).all()

    # Format matches the Django custom JSON response
    return [
        {
            "id": str(d.id),
            "description": d.description,
            "category_id": str(d.category_id),
            "category": d.category.category
        }
        for d in descriptions
    ]


@router.post("/descriptions/", response_model=DescriptionModelResponse, status_code=status.HTTP_201_CREATED)
def create_description(description: DescriptionModelCreate, db: Session = Depends(get_db)):
    new_desc = DescriptionModel(**description.model_dump())
    db.add(new_desc)
    db.commit()
    db.refresh(new_desc)
    return new_desc


@router.patch("/descriptions/{description_id}", response_model=DescriptionModelResponse)
def update_description(description_id: UUID, desc_update: DescriptionModelUpdate,
                       db: Session = Depends(get_db)):
    db_desc = db.query(DescriptionModel).filter(DescriptionModel.id == description_id).first()
    if not db_desc:
        raise HTTPException(status_code=404, detail="Description not found")

    update_data = desc_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_desc, key, value)

    db.commit()
    db.refresh(db_desc)
    return db_desc


@router.delete("/descriptions/{description_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_description(description_id: UUID, db: Session = Depends(get_db)):
    db_desc = db.query(DescriptionModel).filter(DescriptionModel.id == description_id).first()
    if not db_desc:
        raise HTTPException(status_code=404, detail="Description not found")
    db.delete(db_desc)
    db.commit()


# ==========================================
# COST ENDPOINTS
# ==========================================

@router.get("/costs/", response_model=List[CostModelResponse])
def list_costs(
        category_id: Optional[UUID] = None,
        description_id: Optional[UUID] = None,
        db: Session = Depends(get_db)
):
    query = db.query(CostModel).filter(CostModel.is_archived == False)

    if category_id:
        query = query.filter(CostModel.category_id == category_id)
    if description_id:
        query = query.filter(CostModel.description_id == description_id)

    return query.order_by(CostModel.cost_date.desc()).all()


@router.get("/costs/archived/", response_model=List[CostModelResponse])
def list_archived_costs(db: Session = Depends(get_db)):
    return db.query(CostModel).filter(
        CostModel.is_archived == True
    ).order_by(CostModel.cost_date.desc()).all()


@router.get("/costs/totals/")
def get_cost_totals(db: Session = Depends(get_db)):
    """Replicates the total aggregation logic from the Django view"""
    totals = db.query(
        func.sum(case((CostModel.is_credit == True, CostModel.euro_amount), else_=0)).label('credit_sum'),
        func.sum(case((CostModel.is_credit == False, CostModel.euro_amount), else_=0)).label('debit_sum')
    ).filter(CostModel.is_archived == False).first()

    credit_sum = totals.credit_sum or 0.0
    debit_sum = totals.debit_sum or 0.0
    balance_sum = credit_sum - debit_sum

    return {
        "credit_sum": round(credit_sum, 2),
        "debit_sum": round(debit_sum, 2),
        "balance_sum": round(balance_sum, 2)
    }


@router.post("/costs/", response_model=CostModelResponse, status_code=status.HTTP_201_CREATED)
def create_cost(cost: CostModelCreate, db: Session = Depends(get_db)):
    new_cost = CostModel(**cost.model_dump())
    db.add(new_cost)
    db.commit()
    db.refresh(new_cost)
    return new_cost


@router.patch("/costs/{cost_id}", response_model=CostModelResponse)
def update_cost(cost_id: UUID, cost_update: CostModelUpdate, db: Session = Depends(get_db)):
    db_cost = db.query(CostModel).filter(CostModel.id == cost_id).first()
    if not db_cost:
        raise HTTPException(status_code=404, detail="Cost not found")

    update_data = cost_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cost, key, value)

    db.commit()
    db.refresh(db_cost)
    return db_cost


@router.delete("/costs/{cost_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost(cost_id: UUID, db: Session = Depends(get_db)):
    db_cost = db.query(CostModel).filter(CostModel.id == cost_id).first()
    if not db_cost:
        raise HTTPException(status_code=404, detail="Cost not found")
    db.delete(db_cost)
    db.commit()


@router.patch("/costs/{cost_id}/archive", response_model=CostModelResponse)
def toggle_archive_cost(cost_id: UUID, db: Session = Depends(get_db)):
    db_cost = db.query(CostModel).filter(CostModel.id == cost_id).first()
    if not db_cost:
        raise HTTPException(status_code=404, detail="Cost not found")

    db_cost.is_archived = not db_cost.is_archived
    db.commit()
    db.refresh(db_cost)
    return db_cost


# ==========================================
# EXCEL EXPORT
# ==========================================

@router.get("/costs/export/excel")
def export_costs_excel(db: Session = Depends(get_db)):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Costs Export"

    headers = [
        "Date", "Category", "Description", "Amount (€)", "No BTW (€)",
        "BTW (€)", "BTW (%)", "Supplier", "Invoice Nmb", "AI Summary",
        "Quarter", "Is Credit", "Is Archived", "Note"
    ]
    ws.append(headers)

    # joinedload prevents N+1 query problems when fetching relationships
    costs = db.query(CostModel).options(
        joinedload(CostModel.category),
        joinedload(CostModel.descriptions)
    ).filter(CostModel.is_archived == False).order_by(CostModel.cost_date.desc()).all()

    for cost in costs:
        category_name = cost.category.category if cost.category else "N/A"
        description_name = cost.descriptions.description if cost.descriptions else "N/A"
        cost_type = "Credit" if cost.is_credit else "Debit"
        is_archived = "Archived" if cost.is_archived else "In Use"

        # format date for Excel
        date_str = cost.cost_date.strftime("%Y-%m-%d") if cost.cost_date else ""

        row = [
            date_str, category_name, description_name, cost.euro_amount,
            cost.amount_no_btw, cost.amount_btw, cost.btw_percent,
            cost.supplier, cost.invoice_nmb, cost.ai_summary,
            cost.quarter_reference, cost_type, is_archived, cost.cost_note
        ]
        ws.append(row)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"costs_export_{timestamp}.xlsx"

    # Save to a BytesIO stream instead of a physical file
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }

    return StreamingResponse(
        output,
        headers=headers,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )