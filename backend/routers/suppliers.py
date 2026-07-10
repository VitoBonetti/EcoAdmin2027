from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from models.suppliers import SupplierModel, LoadingAddressModel
from schema import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierSearchResponse
)
from middleware.auth import get_current_user

router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/search", response_model=List[SupplierSearchResponse])
def search_suppliers(q: Optional[str] = Query(None, description="Search query string"), db: Session = Depends(get_db)):
    base_query = db.query(SupplierModel).options(joinedload(SupplierModel.loading_addresses))

    if q:
        search_term = f"%{q}%"
        base_query  = base_query.filter(or_(
            SupplierModel.supplier_name.ilike(search_term),
            SupplierModel.city.ilike(search_term),
            SupplierModel.nation.ilike(search_term)
        ))

    suppliers = base_query.all()
    return {
        "suppliers": suppliers,
        "count": len(suppliers)
    }


@router.get("/", response_model=List[SupplierResponse])
def get_all_suppliers(db: Session = Depends(get_db)):
    return db.query(SupplierModel).options(joinedload(SupplierModel.loading_addresses)).all()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier_details(supplier_id: UUID, db: Session = Depends(get_db)):
    db_supplier = db.query(SupplierModel).options(joinedload(SupplierModel.loading_addresses)).filter(SupplierModel.supplier_id==supplier_id).first()

    if not db_supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    return db_supplier


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(supplier_data: SupplierCreate, db: Session = Depends(get_db)):
    # get nested addresses
    addresses_data = supplier_data.loading_addresses
    # put the supplier data, excluding the nested relationship
    supplier_dict = supplier_data.model_dump(exclude={'loading_addresses'})
    new_supplier = SupplierModel(**supplier_dict)

    db.add(new_supplier)
    # flush to get the new_supplier.id before committing
    db.flush()

    # create nested loading address
    for address in addresses_data:
        new_address = LoadingAddressModel(**address.model_dump(), supplier_id=new_supplier.id)
        db.add(new_address)

    db.commit()
    db.refresh(new_supplier)
    return new_supplier


@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: UUID, supplier_update: SupplierUpdate, db: Session = Depends(get_db)):
    db_supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    update_data = supplier_update.model_dump(exclude_unset=True, exclude={'loading_addresses'})

    for key, value in update_data.items():
        setattr(db_supplier, key, value)

    # add nested loading addresses if they are provided
    if supplier_update.loading_addresses is not None:
        # Delete existing addresses and recreate them based on the new payload
        db.query(LoadingAddressModel).filter(LoadingAddressModel.supplier_id == supplier_id).delete()

        for address in supplier_update.loading_addresses:
            new_address = LoadingAddressModel(
                **address.model_dump(exclude={'id'}),  # exclude id so a new UUID is generated
                supplier_id=supplier_id
            )
            db.add(new_address)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: UUID, db: Session = Depends(get_db)):
    """Replaces Django DeleteSupplierView"""
    db_supplier = db.query(SupplierModel).filter(SupplierModel.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    db.delete(db_supplier)
    db.commit()