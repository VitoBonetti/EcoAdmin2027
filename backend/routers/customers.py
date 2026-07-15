from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from schema import (
    CustomerModelCreate, CustomerModelUpdate, CustomerModelResponse, CustomerSearchResponse
)
from models.customers import CustomerModel
from middleware.auth import get_current_user

router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[CustomerModelResponse])
def list_customers(db: Session = Depends(get_db)):
    return db.query(CustomerModel).order_by(CustomerModel.name).all()


@router.post("/", response_model=CustomerModelResponse)
def create_customer(customer: CustomerModelCreate, db: Session = Depends(get_db)):
    new_customer = CustomerModel(**customer.model_dump())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.patch("/{customer_id}", response_model=CustomerModelResponse)
def update_customer(customer_id: UUID, customer_update: CustomerModelUpdate, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    update_data = customer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)

    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: UUID, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    db.delete(db_customer)
    db.commit()


@router.get("/search", response_model=CustomerSearchResponse)
def search_customers(
        q: Optional[str] = Query(None, description="Search query string"),
        db: Session = Depends(get_db)
):
    # Start with the base query
    base_query = db.query(CustomerModel)

    if q:
        # Wrap the search term in wildcards for SQL 'LIKE' matching
        search_term = f"%{q}%"

        # Apply the OR conditions using SQLAlchemy's ilike for case-insensitive matching
        base_query = base_query.filter(
            or_(
                CustomerModel.name.ilike(search_term),
                CustomerModel.address.ilike(search_term),
                CustomerModel.postcode.ilike(search_term),
                CustomerModel.city.ilike(search_term),
                CustomerModel.nation.ilike(search_term),
                CustomerModel.email.ilike(search_term)
            )
        )

    # Execute the query
    customers = base_query.all()

    return {
        "customers": customers,
        "count": len(customers)
    }


@router.get("/{customer_id}", response_model=CustomerModelResponse)
def get_customer_details(customer_id: UUID, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return db_customer