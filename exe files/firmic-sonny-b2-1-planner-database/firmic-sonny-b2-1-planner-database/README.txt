FIRMIC PHASE B.2.1 — SONNY PLANNER DATABASE

ADD:
Backend/models/sonny_plan.py
Backend/migrations/create_sonny_plans.sql

DO NOT REPLACE ANY EXISTING FILE.

RUN create_sonny_plans.sql in pgAdmin Query Tool.

NEW TABLES:
sonny_plans
sonny_plan_items

VERIFY:
python -c "from models.sonny_plan import SonnyPlan, SonnyPlanItem; print('SONNY PLANNER MODELS OK')"

This increment adds persistence only. Planner logic and routes come in B.2.2 and B.2.3.
