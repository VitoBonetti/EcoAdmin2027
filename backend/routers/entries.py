import io
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, APIRouter, Depends, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, desc, asc
from database import get_db
from schema import (
    EntryModelCreate,
    EntryModelUpdate,
    EntryModelResponse,
    EntryModelBase,
    EntryProductModelBase,
    EntryProductModelCreate,
    EntryProductModelUpdate,
    EntryProductModelResponse,
)
from models.entries import EntryModel, UnityChoises, EntryProductsModel
from middleware.auth import get_current_user

router = APIRouter(
    prefix="/entries",
    tags=["Entries"],
    dependencies=[Depends(get_current_user)],
)


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