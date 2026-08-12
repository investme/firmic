from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal
from models.subscription import Plan
from routes import auth
from sqlalchemy import text
from database import engine
from routes import company
from routes import document
from routes import task
from routes import task_update
from routes import sonny
from routes import sonny_chat
from routes import sonny_brain
from routes import workflow
from routes import progress
from routes import hermes
from routes import hermes_agent
from routes import support
from routes import executive_intelligence
from routes import intelligence

from routes.admin import router as admin_router
from routes.usage_ledger import router as usage_ledger_router
from routes.activity_log import router as activity_log_router
from routes.company_ai_agents import router as company_ai_agents_router
from routes.meeting_bookings import router as meeting_bookings_router
from routes.workforce import router as workforce_router
from routes.timeline import router as timeline_router
from routes.notifications import router as notifications_router
from routes.customer_hub import router as customer_hub_router

from api.offices import router as offices_router

from models.workforce_job import (
    WorkforceJob,
    WorkforceTimelineEvent,
)
from models.launch_center import (
    BankPartner,
    FormationPartner,
    LaunchApplication,
    LaunchMilestone,
)
from routes.subscriptions import router as subscriptions_router
from routes.launch_center import router as launch_center_router
from routes.launch import router as launch_router


app = FastAPI(
    title="Firmic Backend",
    version="1.4.0",
)
@app.get("/api/debug/database")
def debug_database():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar()

        schema_name = connection.execute(
            text("SELECT current_schema()")
        ).scalar()

        search_path = connection.execute(
            text("SHOW search_path")
        ).scalar()

        plans = connection.execute(
            text(
                """
                SELECT
                    id,
                    code,
                    name,
                    monthly_price,
                    max_ai_employees,
                    active
                FROM plans
                ORDER BY monthly_price
                """
            )
        ).mappings().all()

    return {
        "database": database_name,
        "schema": schema_name,
        "search_path": search_path,
        "plans": [dict(plan) for plan in plans],
    }
@app.get("/api/debug/plan/{plan_code}")
def debug_plan_lookup(plan_code: str):
    db = SessionLocal()

    try:
        normalized_code = plan_code.strip().upper()

        all_plans = db.query(Plan).all()

        exact_plan = (
            db.query(Plan)
            .filter(Plan.code == normalized_code)
            .first()
        )

        active_plan = (
            db.query(Plan)
            .filter(
                Plan.code == normalized_code,
                Plan.active.is_(True),
            )
            .first()
        )

        return {
            "received": repr(plan_code),
            "normalized": repr(normalized_code),
            "orm_table": Plan.__tablename__,
            "all_plans": [
                {
                    "id": plan.id,
                    "code": plan.code,
                    "code_repr": repr(plan.code),
                    "active": plan.active,
                    "active_type": type(plan.active).__name__,
                }
                for plan in all_plans
            ],
            "exact_match": (
                {
                    "id": exact_plan.id,
                    "code": exact_plan.code,
                    "active": exact_plan.active,
                }
                if exact_plan
                else None
            ),
            "active_match": (
                {
                    "id": active_plan.id,
                    "code": active_plan.code,
                    "active": active_plan.active,
                }
                if active_plan
                else None
            ),
        }
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.56.1:3000",
        "http://192.168.56.1:3001",
        "https://firmic.vercel.app",
        "https://firmic-hussein-matars-projects.vercel.app",
        "https://firmic.io",
        "https://www.firmic.io",
        "https://app.firmic.io",
    ],
    allow_origin_regex=r"https://firmic(?:-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"],
)

app.include_router(
    company.router,
    prefix="/api/company",
)

app.include_router(
    document.router,
    prefix="/api/document",
)

app.include_router(
    task.router,
    prefix="/api/task",
)

app.include_router(
    task_update.router,
    prefix="/api/task",
)

app.include_router(
    sonny.router,
    prefix="/api/sonny",
)

app.include_router(
    sonny_chat.router,
    prefix="/api/sonny",
)

app.include_router(
    sonny_brain.router,
    prefix="/api/sonny/brain",
    tags=["Sonny Brain"],
)

app.include_router(
    workflow.router,
    prefix="/api/workflow",
)

app.include_router(
    progress.router,
    prefix="/api/progress",
)

app.include_router(
    hermes.router,
    prefix="/api/hermes",
)
app.include_router(
    hermes_agent.router,
    prefix="/api/hermes-agent",
    tags=["Hermes Agent"],
)

app.include_router(
    intelligence.router,
)

app.include_router(
    launch_center_router,
    prefix="/api/launch-center",
    tags=["Launch Center"],
)

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

app.include_router(subscriptions_router)
app.include_router(launch_router)


@app.get("/")
def root():
    return {
        "app": "Firmic Backend",
        "status": "running",
        "version": "1.4.0",
    }


@app.get("/health")
def health():
    return {
        "app": "Firmic Backend",
        "status": "healthy",
        "version": "1.4.0",
    }


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
        "firmic_intelligence_engine": "v1",
    }