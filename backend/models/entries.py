import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, ForeignKey, Boolean,  Integer, Numeric, Enum, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class EntryModel(Base):
    __tablename__ = 'entries'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date)
    overdue_date = Column(Date, nullable=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('company.id', ondelete='SET NULL'), nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey('customers.id', ondelete='SET NULL'), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True)
    loading_address = Column(UUID(as_uuid=True), ForeignKey('loading_addresses.id', ondelete='SET NULL'), nullable=True)
    quotation_reference = Column(String(11), nullable=True, unique=True, editable=False)
    invoice_reference = Column(String(11), nullable=True, unique=True, editable=False)
    is_invoice = Column(Boolean, nullable=True, default=False)
    is_commission = Column(Boolean, nullable=True, default=False)
    is_quotation = Column(Boolean, nullable=True, default=False)
    is_paid = Column(Boolean, nullable=True, default=False)
    pallets_quantity = Column(Integer, nullable=True, default=0)
    pallets_price = Column(Numeric(10, 2), default=0, nullable=True)
    pallets_total_price = Column(Numeric(10, 2), default=0, editable=False, nullable=True)
    pallets_notes = Column(String(500), nullable=True)
    transport_gross = Column(Integer, nullable=True, default=0)
    transport_bereken = Column(Integer, nullable=True, default=0, editable=False)
    transport_price_for_ton = Column(Numeric(10, 2), default=0, nullable=True)
    transport_diesel_toeslag = Column(Integer, default=0, nullable=True)  #
    transport_extra_stop = Column(Integer, default=0, nullable=True)  #
    transport_extra_stop_cost = Column(Numeric(10, 2), default=0, nullable=True)
    transport_total_no_btw = Column(Numeric(10, 2), default=0, nullable=True, editable=False)
    transport_total_btw = Column(Numeric(10, 2), default=0, nullable=True, editable=False)
    temp_no_btw_total = Column(Numeric(10, 2), default=0, nullable=True, editable=False)
    no_btw_total = Column(Numeric(10, 2), default=0, nullable=True)
    btw_total = Column(Numeric(10, 2), default=0, nullable=True)
    discount = Column(Integer, default=0, nullable=True)  #
    btw_total_discount = Column(Numeric(10, 2), default=0, nullable=True)
    final_total = Column(Numeric(10, 2), default=0, nullable=True)
    loading_info = Column(String(300), nullable=True)
    notes = Column(String(500), nullable=True)
    year_reference = Column(Integer, nullable=True)
    quarter_reference = Column(String, nullable=True)
    is_archived = Column(Boolean, nullable=True, default=False)

    # relationship
    company = relationship("MyCompanyModel", back_populates="entries")
    customer = relationship("CustomerModel", back_populates="entries")
    supplier = relationship("SupplierModel", back_populates="entries")
    loading_addresses = relationship("LoadingAddressModel", back_populates="entries")
    entry_products = relationship("EntryProductModel", back_populates="entries")

    def update_trasport_bereken(self):
        if self.transport_gross is None:
            self.transport_bereken = 0
            return

        if 0 < int(self.transport_gross) <= 1000:
            self.transport_bereken = 1000
        elif int(self.transport_gross) <= 0:
            self.transport_bereken = 0
        else:
            self.transport_bereken = ((int(self.transport_gross) - 1) // 1000 + 1) * 1000

    @property
    def is_overdue(self):
        if not self.overdue_date:
            return False
        return self.overdue_date < datetime.now().date()


class UnityChoises(enum.Enum):
    M2 = "m2"
    ML = "ml"
    BX = "bx"
    ST = "st"
    FG = "fg"


class EntryProductsModel(Base):
    __tablename__ = 'entry_products'

    id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    entry_id = Column(UUID(as_uuid=True), ForeignKey('entries.id', ondelete='CASCADE'))
    name = Column(String(250), nullable=True)
    description = Column(String(250), nullable=True)
    quantity = Column(Numeric(10, 2), default=0)
    unity = Column(Enum(UnityChoises), default=UnityChoises.M2, nullable=False)
    unity_price = Column(Numeric(10, 2))
    discount = Column(Numeric(3, 1), default=0, nullable=True)
    total = Column(Numeric(10, 2), nullable=True)

    entries = relationship("EntryModel", back_populates="entry_products")

