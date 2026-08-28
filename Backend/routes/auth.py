from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_token_payload,
)
from firmic_models import User


router = APIRouter()


_LOGIN_LIMIT = 5
_REGISTER_LIMIT = 3
_RATE_LIMIT_WINDOW_SECONDS = 60.0

_rate_limit_lock = Lock()
_rate_limit_attempts = defaultdict(deque)


def _enforce_auth_rate_limit(
    operation: str,
    email: str,
    limit: int,
) -> None:
    now = monotonic()
    key = (operation, email.strip().lower())

    with _rate_limit_lock:
        attempts = _rate_limit_attempts[key]
        cutoff = now - _RATE_LIMIT_WINDOW_SECONDS

        while attempts and attempts[0] <= cutoff:
            attempts.popleft()

        if len(attempts) >= limit:
            retry_after = max(
                1,
                int(
                    _RATE_LIMIT_WINDOW_SECONDS
                    - (now - attempts[0])
                )
                + 1,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts",
                headers={
                    "Retry-After": str(retry_after),
                },
            )

        attempts.append(now)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=AuthResponse)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(
        "register",
        data.email,
        _REGISTER_LIMIT,
    )

    existing_user = (
        db.query(User)
        .filter(User.email == data.email.lower())
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role="owner",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/login", response_model=AuthResponse)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    _enforce_auth_rate_limit(
        "login",
        data.email,
        _LOGIN_LIMIT,
    )

    user = (
        db.query(User)
        .filter(User.email == data.email.lower())
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.get("/me")
def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }