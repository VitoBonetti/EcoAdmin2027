import uuid
from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class SupplierModel(Base):
    __tablename__ = 'suppliers'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=True)
    postcode = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    nation = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(255), nullable=True)
    btw = Column(String(25), nullable=True)
    kvk = Column(String(25), nullable=True)
    bankaccountname = Column(String(80), nullable=True)
    iban = Column(String(34), nullable=True)
    is_active = Column(Boolean, default=True)

    loading_addresses = relationship("LoadingAddressModel", back_populates="supplier")


class LoadingAddressModel(Base):
    __tablename__ = 'loading_addresses'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey('suppliers.id', ondelete='CASCADE'))
    address = Column(String(255), nullable=True)
    postcode = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    nation = Column(String(100), nullable=True)

    supplier = relationship("SupplierModel", back_populates="loading_addresses")

