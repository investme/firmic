from fastapi import FastAPI
from routes import company

app = FastAPI(title="Firmic Backend")

app.include_router(company.router, prefix="/api/company")