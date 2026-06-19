from fastapi import APIRouter
from services.sonny_service import ask_sonny

router = APIRouter()


@router.post("/ask")
def sonny_ask(data: dict):

    company_id = data["company_id"]
    question = data["question"]

    answer = ask_sonny(company_id, question)

    return {
        "answer": answer
    }