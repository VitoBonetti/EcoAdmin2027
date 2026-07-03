import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String,  DateTime
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TokenBlocklist(Base):
    __tablename__ = "token_blocklist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    jti = Column(String(36), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)