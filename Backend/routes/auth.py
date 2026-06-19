from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User
from core.security import hash_password, verify_password, create_access_token
import uuid

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):

    user = User(
        id=str(uuid.uuid4()),
        email=data["email"],
        password=hash_password(data["password"])
    )

    db.add(user)
    db.commit()

    return {"message": "User created"}


@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data["email"]).first()

    if not user or not verify_password(data["password"], user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": user.id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id
    }