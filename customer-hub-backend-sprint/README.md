# Customer Hub backend installation

Copy the files into the matching project paths:

- `Backend/models/customer_hub.py`
- `Backend/schemas/customer_hub.py`
- `Backend/routes/customer_hub.py`
- `frontend/services/customerHubApi.ts`

Then update `Backend/main.py`.

Add this import near the other route imports:

```python
from routes.customer_hub import router as customer_hub_router
```

Add this router registration near the other `app.include_router(...)` calls:

```python
app.include_router(customer_hub_router)
```

The router already declares the `/api/customer-hub` prefix.

## Register models before table creation

Wherever your project imports SQLAlchemy models before calling
`Base.metadata.create_all(...)`, add:

```python
from models.customer_hub import (
    Customer,
    CustomerContact,
    CustomerOpportunity,
    CustomerCommunication,
    CustomerSupportTicket,
    CustomerActivity,
)
```

If `main.py` is currently where all models are imported, adding the same import
there before startup is enough.

## Create the PostgreSQL tables

For the current MVP setup, run once from `Backend`:

```bash
python -c "from database import Base, engine; import models.customer_hub; Base.metadata.create_all(bind=engine); print('Customer Hub tables created')"
```

Then start the API:

```bash
uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

You should see a **Customer Hub** section.

## First API smoke test

1. Log into the Firmic frontend.
2. Copy the JWT from browser storage key `firmic_token`.
3. In Swagger, authorize with `Bearer <token>`.
4. Run `POST /api/customer-hub` with:

```json
{
  "company_id": "YOUR_ACTIVE_COMPANY_ID",
  "name": "Acme Technologies",
  "industry": "Technology",
  "status": "prospect",
  "relationship_score": 72,
  "health": "healthy",
  "tags": ["Enterprise", "High Priority"]
}
```

5. Run `GET /api/customer-hub/company/{company_id}`.

## Important

The routes verify that the logged-in user owns the company before returning or
changing customer data. This preserves Firmic tenant isolation.
