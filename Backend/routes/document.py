from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.company import Document
import uuid

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create")
def create_document(
    company_id: str,
    name: str,
    type: str = "General",
    status: str = "pending",
    file_path: str = None,
    db: Session = Depends(get_db),
):
    document = Document(
        id=str(uuid.uuid4()),
        company_id=company_id,
        name=name,
        type=type,
        status=status,
        file_path=file_path,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "status": "created",
        "document": {
            "id": document.id,
            "company_id": document.company_id,
            "name": document.name,
            "type": document.type,
            "status": document.status,
            "file_path": document.file_path,
            "uploaded_at": document.uploaded_at,
        },
    }


@router.get("/list")
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()

    return [
        {
            "id": d.id,
            "company_id": d.company_id,
            "name": d.name,
            "type": d.type,
            "status": d.status,
            "file_path": d.file_path,
            "uploaded_at": d.uploaded_at,
        }
        for d in documents
    ]


@router.get("/company/{company_id}")
def list_company_documents(company_id: str, db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.company_id == company_id).all()

    return [
        {
            "id": d.id,
            "company_id": d.company_id,
            "name": d.name,
            "type": d.type,
            "status": d.status,
            "file_path": d.file_path,
            "uploaded_at": d.uploaded_at,
        }
        for d in documents
    ]


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        return {"status": "not_found"}

    db.delete(document)
    db.commit()

    return {"status": "deleted", "document_id": document_id}