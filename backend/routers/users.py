from os import access
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from middleware import auth
from models.users import UserModel, TokenBlocklist
from database import get_db
from schema import Token, UserModelResponse, UserModelCreate, UserModelUpdate
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt

router = APIRouter(prefix="/users")


@router.post("/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm), db: Session = Depends(get_db)):

    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,  # Blocks JavaScript from reading it
        secure=False,  # True in prd
        samesite="lax",  # Protects against CSRF attacks
        max_age=86400
    )
    return {"message": "Successfully logged in", "user": {"id": user.id, "name": user.name, "email": user.email}}


@router.post("/logout")
def logout(
        response: Response, # <-- Inject Response to delete the cookie
        token: str = Depends(auth.get_token_from_cookie), # <-- Read from the cookie, not the header!
        db: Session = Depends(get_db)
):
    try:
        # 1. Keep your existing logic to blocklist the token in the database
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")

        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)

        blocked_token = TokenBlocklist(jti=jti, expires_at=expires_at)
        db.add(blocked_token)
        db.commit()

    except JWTError:
        pass

    # 2. Tell the user's browser to physically delete the HttpOnly cookie
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")

    return {"message": "Successfully logged out. Token has been revoked server-side and cookie deleted."}


@router.post("/users", response_model=UserModelResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserModelCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(user.password)
    new_user = UserModel(name=user.name, email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserModelResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(auth.get_current_user)
):
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserModelResponse)
def view_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(auth.get_current_user) # Endpoint protected
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserModelResponse)
def edit_user(
        user_id: UUID,
        user_update: UserModelUpdate,
        db: Session = Depends(get_db),
        current_user: UserModel = Depends(auth.get_current_user)  # Endpoint protected
):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = auth.get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: UserModel = Depends(auth.get_current_user)  # Endpoint protected
):
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(db_user)
    db.commit()
    return None