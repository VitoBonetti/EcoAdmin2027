import uuid
from sqlalchemy import Column, String,  Boolean
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class CustomerModel(Base):
    __tablename__ = 'customers'

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
