from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models.company import Company, Document
from auth import get_token_payload
import uuid
from schemas.document import DocumentCreate

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_company_access(company_id: str, user_id: str, db: Session):
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=403, detail="Access denied")

    return company


@router.post("/create")
def create_document(
    payload: DocumentCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    verify_company_access(payload.company_id, user_id, db)

    document = Document(
        id=str(uuid.uuid4()),
        company_id=payload.company_id,
        name=payload.name,
        type=payload.type,
        status=payload.status,
        file_path=payload.file_path,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {"status": "created", "document": serialize_document(document)}

@router.get("/list")
def list_documents(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    documents = (
        db.query(Document)
        .join(Company, Document.company_id == Company.id)
        .filter(Company.user_id == str(user_id))
        .all()
    )

    return [serialize_document(d) for d in documents]


@router.get("/company/{company_id}")
def list_company_documents(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    verify_company_access(company_id, user_id, db)

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .all()
    )

    return [serialize_document(d) for d in documents]


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    document = (
        db.query(Document)
        .join(Company, Document.company_id == Company.id)
        .filter(
            Document.id == document_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(document)
    db.commit()

    return {"status": "deleted", "document_id": document_id}


def serialize_document(d: Document):
    return {
        "id": d.id,
        "company_id": d.company_id,
        "name": d.name,
        "type": d.type,
        "status": d.status,
        "file_path": d.file_path,
        "uploaded_at": d.uploaded_at,
    }