FIRMIC PHASE B.3.4 — SONNY DASHBOARD MEMORY INTELLIGENCE

REPLACE:

Backend/services/sonny/dashboard.py
Backend/routes/sonny.py

THE ROUTE FILE IS BUILT FROM THE VERIFIED B.3.3 INSIGHT API VERSION.

DO NOT REPLACE:

Backend/services/sonny/insights.py
Backend/services/sonny/planner.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

EXISTING ENDPOINT ENRICHED:

GET /api/sonny/company/{company_id}/dashboard

NEW QUERY OPTION:

rebuild_insights_if_missing=true

MEMORY INTELLIGENCE RESPONSE:

memory_intelligence.active_count
memory_intelligence.critical_count
memory_intelligence.high_count
memory_intelligence.medium_count
memory_intelligence.low_count
memory_intelligence.actionable_count
memory_intelligence.recurring_count
memory_intelligence.improving_count
memory_intelligence.worsening_count
memory_intelligence.top_pattern
memory_intelligence.recommended_focus
memory_intelligence.recurring_patterns
memory_intelligence.items

EXECUTIVE BRIEF ALSO INCLUDES:

active_insights
critical_insights
high_insights

GENERATED_FROM ALSO INCLUDES:

insight_count

BEHAVIOR:

- Returns active insight intelligence in the executive dashboard.
- Automatically generates insights if none exist and
  rebuild_insights_if_missing=true.
- Sorts insights by severity and recency.
- Surfaces the most important actionable pattern.
- Surfaces evidence-backed recommended focus items.
- Preserves every existing dashboard section.

INSTALL:

1. Replace Backend/services/sonny/dashboard.py
2. Replace Backend/routes/sonny.py
3. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:

python -c "from services.sonny.dashboard import build_sonny_dashboard; from routes.sonny import router; print('SONNY B3.4 DASHBOARD OK')"

SWAGGER TEST:

GET /api/sonny/company/{company_id}/dashboard

Confirm HTTP 200 and top-level:

memory_intelligence

Confirm:

memory_intelligence.active_count >= 1
memory_intelligence.top_pattern is present
memory_intelligence.items contains insights
executive_brief.active_insights is present
generated_from.insight_count is present

SAFETY:

This remains a read-oriented executive aggregation endpoint.

It does not execute actions, charge tenants, activate offices,
close tickets, modify compliance, or hire AI employees.

AFTER THIS PASSES:

PHASE B.3 IS COMPLETE.

NEXT:

B.4 Controlled Automation Engine.
