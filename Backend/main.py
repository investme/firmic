from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import company
from routes import document
from routes import task
from database import Base, engine
from models.company import Company, Document, Task
from routes import task_update
from routes import sonny

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Firmic Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.56.1:3000",
        "http://192.168.56.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(company.router, prefix="/api/company")
app.include_router(document.router, prefix="/api/document")
app.include_router(task.router, prefix="/api/task")
app.include_router(
    task_update.router,
    prefix="/api/task")
app.include_router(task_update.router, prefix="/api/task")
app.include_router(sonny.router, prefix="/api/sonny")

@app.get("/health")
def health():
    return {"status": "ok"}