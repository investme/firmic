from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import SessionLocal

from routes import auth
from routes import company
from routes import admin
from routes import document
from routes import task
from routes import task_update
from routes import sonny
from routes import sonny_chat
from routes import sonny_brain
from routes import workflow
from routes import progress
from routes import hermes
from routes import support

from routes.admin import router as admin_router
from routes.usage_ledger import router as usage_ledger_router
from routes.activity_log import router as activity_log_router
from routes.company_ai_agents import router as company_ai_agents_router
from routes.meeting_bookings import router as meeting_bookings_router

from api.offices import router as offices_router
from fastapi.middleware.cors import CORSMiddleware
from routes.workforce import router as workforce_router
from models.workforce_job import (
    WorkforceJob,
    WorkforceTimelineEvent,
)
from routes import executive_intelligence
from routes.timeline import router as timeline_router
from routes.notifications import router as notifications_router
from routes.customer_hub import router as customer_hub_router


app = FastAPI(
    title="Firmic Backend",
    version="1.3.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.56.1:3000",
        "http://192.168.56.1:3001",
        "https://firmic.io",
        "https://www.firmic.io",
        "https://app.firmic.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(company.router, prefix="/api/company")
app.include_router(document.router, prefix="/api/document")
app.include_router(task.router, prefix="/api/task")
app.include_router(task_update.router, prefix="/api/task")
app.include_router(sonny.router, prefix="/api/sonny")
app.include_router(sonny_chat.router, prefix="/api/sonny")
app.include_router(sonny_brain.router, prefix="/api/sonny/brain", tags=["Sonny Brain"])
app.include_router(workflow.router, prefix="/api/workflow")
app.include_router(progress.router, prefix="/api/progress")
app.include_router(hermes.router, prefix="/api/hermes")

app.include_router(admin_router)
app.include_router(usage_ledger_router)
app.include_router(activity_log_router)
app.include_router(company_ai_agents_router)
app.include_router(meeting_bookings_router)
app.include_router(offices_router)
app.include_router(support.router)
app.include_router(workforce_router)
app.include_router(
    executive_intelligence.router,
    prefix="/api/executive-intelligence",
    tags=["Executive Intelligence"],
)
app.include_router(workforce_router)

app.include_router(
    executive_intelligence.router,
    prefix="/api/executive-intelligence",
    tags=["Executive Intelligence"],
)
app.include_router(
    timeline_router,
    prefix="/api/timeline",
    tags=["Timeline"],
)
app.include_router(
    notifications_router,
    prefix="/api/notifications",
    tags=["Notifications"],
)
app.include_router(customer_hub_router)


@app.get("/")
def root():
    return {
        "app": "Firmic Backend",
        "status": "running",
        "version": "1.4.0",
    }


@app.get("/health")
def health():
    db = SessionLocal()

    try:
        db.execute(text("SELECT 1"))

        return {
            "app": "Firmic Backend",
            "status": "healthy",
            "version": "1.4.0",
            "database": "connected",
            "authentication": "enabled",
            "usage_ledger": "enabled",
            "activity_log": "enabled",
            "ai_workforce_sync": "enabled",
            "meeting_booking_sync": "enabled",
        }

    finally:
        db.close()


@app.get("/version")
def version():
    return {
        "product": "Firmic",
        "version": "1.4.0",
        "phase": "Operational Synchronization",
        "database": "PostgreSQL",
        "authentication": "JWT",
        "tenant_isolation": "enabled",
        "usage_ledger": "enabled",
        "activity_log": "enabled",
        "ai": "Sonny",
        "sonny_memory": "enabled",
        "sonny_knowledge": "enabled",
    }
