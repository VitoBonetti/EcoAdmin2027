from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Any, List
from uuid import UUID
from datetime import datetime, date


# --- COST CATEGORY SCHEMAS ---
class CategoryModelBase(BaseModel):
    category: str

class CategoryModelCreate(CategoryModelBase):
    category: str

class CategoryModelUpdate(BaseModel):
    category: Optional[str]

class CategoryModelResponse(CategoryModelBase):
    id: UUID
    category: str

    class Config:
        from_attributes = True

# --- COST DESCRIPTION CATEGORY SCHEMAS ---
class DescriptionModelBase(BaseModel):
    category_id: UUID
    description: str

class DescriptionModelCreate(DescriptionModelBase):
    category_id: UUID
    description: str

class DescriptionModelUpdate(BaseModel):
    category_id: Optional[UUID]
    description: Optional[str]

class DescriptionModelResponse(DescriptionModelBase):
    id: UUID
    category_id: UUID
    description: str

    class Config:
        from_attributes = True

# --- COST SCHEMAS ---
class CostModelBase(BaseModel):
    cost_date: date
    category_id: UUID
    description_id: UUID
    euro_amount: float
    amount_no_btw: Optional[float]
    amount_btw: Optional[float]
    btw_percent: Optional[float]
    is_credit: bool = False
    cost_note: Optional[str]
    supplier: Optional[str]
    invoice_nmb: Optional[str]
    ai_summary: Optional[str]
    year_reference: Optional[int]
    quarter_reference: Optional[str]
    file_name: Optional[str]
    is_archived: bool = False

class CostModelCreate(CostModelBase):
    cost_date: date
    category_id: UUID
    description_id: UUID
    euro_amount: float

class CostModelUpdate(BaseModel):
    cost_date: Optional[date]
    category_id: Optional[UUID]
    description_id: Optional[UUID]
    euro_amount: Optional[float]
    amount_no_btw: Optional[float]
    amount_btw: Optional[float]
    btw_percent: Optional[float]
    is_credit: Optional[bool]
    cost_note: Optional[str]
    supplier: Optional[str]
    invoice_nmb: Optional[str]
    ai_summary: Optional[str]
    year_reference: Optional[int]
    quarter_reference: Optional[str]
    file_name: Optional[str]
    is_archived: Optional[bool]

class CostModelResponse(CostModelBase):
    id: UUID
    cost_date: date
    category_id: UUID
    description_id: UUID
    euro_amount: float
    amount_no_btw: Optional[float]
    amount_btw: Optional[float]
    btw_percent: Optional[float]
    is_credit: bool
    cost_note: Optional[str]
    supplier: Optional[str]
    invoice_nmb: Optional[str]
    ai_summary: Optional[str]
    year_reference: Optional[int]
    quarter_reference: Optional[str]
    file_name: Optional[str]
    is_archived: bool

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserModelBase(BaseModel):
    name: str
    email: EmailStr

class UserModelCreate(UserModelBase):
    password: str

class UserModelUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserModelResponse(UserModelBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
