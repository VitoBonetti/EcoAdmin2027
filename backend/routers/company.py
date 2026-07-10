from uuid import UUID
from typing import List
from fastapi import HTTPException, APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from schema import (
    MyCompanyModelUpdate,
    MyCompanyModelCreate,
    MyCompanyModelResponse
)
from models.company import MyCompanyModel
from middleware.auth import get_current_user

router = APIRouter(
    prefix="/mycompany",
    tags=["My Company"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/", response_model=List[MyCompanyModelResponse])
def get_company(db: Session = Depends(get_db)):
    return db.query(MyCompanyModel).all()


@router.post("/", response_model=MyCompanyModelResponse, status_code=status.HTTP_201_CREATED)
def create_company(company: MyCompanyModelCreate, db: Session = Depends(get_db)):
    new_company = MyCompanyModel(**company.model_dump())
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company


@router.patch("/{company_id}", response_model=MyCompanyModelResponse)
def update_company(company_id: UUID, company_update: MyCompanyModelUpdate, db: Session = Depends(get_db)):
    db_company = db.query(MyCompanyModel).filter(MyCompanyModel.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = company_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_company, key, value)

    db.commit()
    db.refresh(db_company)
    return db_company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: UUID, db: Session = Depends(get_db)):
    db_company = db.query(MyCompanyModel).filter(MyCompanyModel.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(db_company)
    db.commit()


@router.get("/{company_id}", response_model=MyCompanyModelResponse)
def get_company_details(company_id: UUID, db: Session = Depends(get_db)):
    db_company = db.query(MyCompanyModel).filter(MyCompanyModel.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    return db_company

