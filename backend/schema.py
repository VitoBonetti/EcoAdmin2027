from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, Any, List, Dict
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

from sqlalchemy import Numeric


# --- CUSTOMER SCHEMAS ---
class CustomerModelBase(BaseModel):
    name: str
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    bankaccountname: Optional[str] = None
    iban: Optional[str] = None
    is_active: bool = True


class CustomerModelCreate(CustomerModelBase):
    # Inherits everything exactly as-is from Base
    pass


class CustomerModelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    bankaccountname: Optional[str] = None
    iban: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerModelResponse(CustomerModelBase):
    id: UUID

    class Config:
        from_attributes = True


class CustomerSearchResponse(BaseModel):
    customers: List[CustomerModelResponse]
    count: int
    

# --- COMPANY SCHEMAS ---
class MyCompanyModelBase(BaseModel):
    name: str
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    iban: Optional[str] = None
    is_active: bool = True


class MyCompanyModelCreate(MyCompanyModelBase):
    # Inherits everything exactly as-is from Base
    pass


class MyCompanyModelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    iban: Optional[str] = None
    is_active: Optional[bool] = None


class MyCompanyModelResponse(MyCompanyModelBase):
    id: UUID

    class Config:
        from_attributes = True


# --- COST CATEGORY SCHEMAS ---
class CategoryModelBase(BaseModel):
    category: str

class CategoryModelCreate(CategoryModelBase):
    pass

class CategoryModelUpdate(BaseModel):
    category: Optional[str]

class CategoryModelResponse(CategoryModelBase):
    id: UUID

    class Config:
        from_attributes = True

# --- COST DESCRIPTION CATEGORY SCHEMAS ---
class DescriptionModelBase(BaseModel):
    category_id: UUID
    description: str

class DescriptionModelCreate(DescriptionModelBase):
    pass

class DescriptionModelUpdate(BaseModel):
    category_id: Optional[UUID]
    description: Optional[str]

class DescriptionModelResponse(DescriptionModelBase):
    id: UUID

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
    pass

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


# --- LOADING ADDRESS SCHEMAS ---
class LoadingAddressBase(BaseModel):
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None


class LoadingAddressCreate(LoadingAddressBase):
    pass


class LoadingAddressUpdate(LoadingAddressBase):
    id: Optional[UUID] = None


class LoadingAddressResponse(LoadingAddressBase):
    id: UUID
    supplier_id: UUID

    model_config = ConfigDict(from_attributes=True)


# --- SUPPLIER SCHEMAS ---
class SupplierBase(BaseModel):
    name: str
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    bankaccountname: Optional[str] = None
    iban: Optional[str] = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    # This replaces the FormSet payload. The frontend will send an array of addresses.
    loading_addresses: List[LoadingAddressCreate] = []


class SupplierUpdate(BaseModel):
    # All fields optional for PATCH
    name: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    nation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    btw: Optional[str] = None
    kvk: Optional[str] = None
    bankaccountname: Optional[str] = None
    iban: Optional[str] = None
    is_active: Optional[bool] = None
    # For updating nested relationships, it's often easier to just send the new desired state
    loading_addresses: Optional[List[LoadingAddressUpdate]] = None


class SupplierResponse(SupplierBase):
    id: UUID
    # this automatically serializes the SQLAlchemy relationship into a JSON list
    loading_addresses: List[LoadingAddressResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SupplierSearchResponse(BaseModel):
    suppliers: List[SupplierResponse]
    count: int

# -- ENTRIES SCHEMA --
class EntryModelBase(BaseModel):
    date: date
    overdue_date: Optional[date] = None
    company_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    loading_address: Optional[UUID] = None
    quotation_reference: Optional[str] = None
    invoice_reference: Optional[str] = None
    is_invoice: bool = False
    is_commission: bool = False
    is_quotation: bool = False
    is_paid: bool = False
    pallets_quantity: Optional[int] = 0
    pallets_price: Optional[Decimal] = Decimal('0')
    pallets_total_price: Optional[Decimal] = Decimal('0')
    pallets_notes: Optional[str] = None
    transport_gross: Optional[int] = 0
    transport_bereken: Optional[int] = 0
    transport_price_for_ton: Optional[Decimal] = Decimal('0')
    transport_diesel_toeslag: Optional[int] = Field(default=0, ge=0, le=100)
    transport_extra_stop: Optional[int] = Field(default=0, ge=0, le=100)
    transport_extra_stop_cost: Optional[Decimal] = Decimal('0')
    transport_total_no_btw: Optional[Decimal] = Decimal('0')
    transport_total_btw: Optional[Decimal] = Decimal('0')
    temp_no_btw_total: Optional[Decimal] = Decimal('0')
    no_btw_total: Optional[Decimal] = Decimal('0')
    btw_total: Optional[Decimal] = Decimal('0')
    discount: Optional[int] = Field(default=0, ge=0, le=100)
    btw_total_discount: Optional[Decimal] = Decimal('0')
    final_total: Optional[Decimal] = Decimal('0')
    loading_info: Optional[str] = None
    notes: Optional[str] = None
    year_reference: Optional[int] = None
    quarter_reference: Optional[str] = None
    is_archived: bool = False


class EntryModelCreate(EntryModelBase):
    pass


class EntryModelUpdate(BaseModel):
        date: Optional[date]
        overdue_date: Optional[date]
        company_id: Optional[UUID]
        customer_id: Optional[UUID]
        supplier_id: Optional[UUID]
        loading_address: Optional[UUID]
        quotation_reference: Optional[str]
        invoice_reference: Optional[str]
        is_invoice: Optional[bool]
        is_commission: Optional[bool]
        is_quotation: Optional[bool]
        is_paid: Optional[bool]
        pallets_quantity: Optional[int]
        pallets_price: Optional[Decimal]
        pallets_total_price: Optional[Decimal]
        pallets_notes: Optional[str]
        transport_gross: Optional[int]
        transport_bereken: Optional[int]
        transport_price_for_ton: Optional[Decimal]
        transport_diesel_toeslag: Optional[int]
        transport_extra_stop: Optional[int]
        transport_extra_stop_cost: Optional[Decimal]
        transport_total_no_btw: Optional[Decimal]
        transport_total_btw: Optional[Decimal]
        temp_no_btw_total: Optional[Decimal]
        no_btw_total: Optional[Decimal]
        btw_total: Optional[Decimal]
        discount: Optional[int]
        btw_total_discount: Optional[Decimal]
        final_total: Optional[Decimal]
        loading_info: Optional[str]
        notes: Optional[str]
        year_reference: Optional[int]
        quarter_reference: Optional[str]
        is_archived: Optional[bool]

class EntryModelResponse(EntryModelBase):
    id: UUID

    class Config:
        from_attributes = True

class UnityChoisesSchema(str, Enum):
    M2 = "m2"
    ML = "ml"
    BX = "bx"
    ST = "st"
    FG = "fg"

class EntryProductModelBase(BaseModel):
    entry_id: UUID
    name: Optional[str]
    description: Optional[str]
    quantity: Optional[Decimal] = Decimal('0')
    unity: UnityChoisesSchema = UnityChoisesSchema.M2
    unity_price: Optional[Decimal] = Decimal('0')
    discount: Optional[Decimal] = Decimal('0')
    total: Optional[Decimal] = Decimal('0')

class EntryProductModelCreate(EntryProductModelBase):
    products: List['EntryProductModelCreate'] = []

class EntryProductModelUpdate(BaseModel):
    entry_id: Optional[UUID]
    name: Optional[str]
    description: Optional[str]
    quantity: Optional[Decimal]
    unity: Optional[UnityChoisesSchema]
    unity_price: Optional[Decimal]
    discount: Optional[Decimal]
    total: Optional[Decimal]

class EntryProductModelResponse(EntryProductModelBase):
    id: UUID

    class Config:
        from_attributes = True


class EntryDetailContextResponse(BaseModel):
    entry: EntryModelResponse
    products: List[EntryProductModelResponse]
    btw_calc: Decimal
    total_discount: Decimal
    transport: Dict[str, Any]
    algemene: Dict[str, str]


class EntryFormDataResponse(BaseModel):
    companies: List[MyCompanyModelResponse]
    customers: List[CustomerModelResponse]
    suppliers: List[SupplierResponse]