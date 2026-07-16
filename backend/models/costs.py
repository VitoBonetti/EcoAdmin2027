import uuid
from sqlalchemy import Column, String, ForeignKey, Boolean,  Integer, Float, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class CategoryModel(Base):
    __tablename__ = "categories_cost"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String, nullable=False)

    descriptions = relationship("DescriptionModel", back_populates="category")
    costs = relationship("CostModel", back_populates="category")


class DescriptionModel(Base):
    __tablename__ = "descriptions_cost"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories_cost.id'), nullable=False)
    description = Column(String, nullable=False)

    category = relationship("CategoryModel", back_populates="descriptions")
    costs = relationship("CostModel", back_populates="descriptions")


class CostModel(Base):
    __tablename__ = "costs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cost_date = Column(Date, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories_cost.id'), nullable=False)
    description_id = Column(UUID(as_uuid=True), ForeignKey('descriptions_cost.id'), nullable=False)
    euro_amount = Column(Float, nullable=False)
    amount_no_btw = Column(Float, nullable=True)
    amount_btw = Column(Float, nullable=True)
    btw_percent = Column(Float, nullable=True)
    is_credit = Column(Boolean, nullable=False)
    cost_note = Column(String, nullable=True)
    supplier = Column(String, nullable=True)
    invoice_nmb = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    year_reference = Column(Integer, nullable=True)
    quarter_reference = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    is_archived = Column(Boolean, nullable=False)

    category = relationship("CategoryModel", back_populates="costs")
    descriptions = relationship("DescriptionModel", back_populates="costs")

