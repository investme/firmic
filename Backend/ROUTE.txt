from fastapi import APIRouter
from services.stripe_service import create_checkout_session

router = APIRouter()


@router.post("/subscribe")
def subscribe(data: dict):

    url = create_checkout_session(
        user_id=data["user_id"],
        plan=data["plan"]
    )

    return {"checkout_url": url}