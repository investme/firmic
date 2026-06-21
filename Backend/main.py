from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import company
from routes import document
from routes import task
from database import Base, engine
from models.company import (
    Company,
    Document,
    Task,
    Workflow,
    WorkflowStep,
)
from routes import task_update
from routes import sonny
from routes import workflow
from routes import progress
from routes import hermes


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
app.include_router(workflow.router, prefix="/api/workflow")
app.include_router(
    progress.router,
    prefix="/api/progress"
)
app.include_router(
    hermes.router,
    prefix="/api/hermes"
)

@app.get("/health")
def health():
    return {"status": "ok"}