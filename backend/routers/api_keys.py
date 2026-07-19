import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from middleware.auth import get_current_user  # Adjust import based on your setup
from models.api_keys import ApiKeyModel

router = APIRouter(prefix="/api-keys", tags=["Developer Settings"], dependencies=[Depends(get_current_user)])


class ApiKeyCreate(BaseModel):
    name: str


@router.get("/")
def get_my_api_keys(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(ApiKeyModel).filter(
        ApiKeyModel.user_id == current_user.id,
        ApiKeyModel.is_active == True
    ).all()


@router.post("/")
def create_api_key(payload: ApiKeyCreate, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    raw_key = f"sk_ecoc_{secrets.token_urlsafe(32)}"

    new_key = ApiKeyModel(
        user_id=current_user.id,
        name=payload.name,
        key=raw_key
    )
    db.add(new_key)
    db.commit()

    # We return the key so the frontend can show it ONCE
    return {"id": new_key.id, "name": new_key.name, "key": raw_key, "created_at": new_key.created_at}


@router.delete("/{key_id}")
def revoke_api_key(key_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_key = db.query(ApiKeyModel).filter(
        ApiKeyModel.id == key_id,
        ApiKeyModel.user_id == current_user.id
    ).first()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found")

    db_key.is_active = False  # Soft delete
    db.commit()
    return {"status": "Revoked"}