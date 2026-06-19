def analyze_context(context):
    signals = []

    open_actions = context.get("open_actions", [])
    financial_activity = context.get("financial_activity", {})
    company_health = context.get("company_health", {})

    if not isinstance(open_actions, list):
        open_actions = []

    if not isinstance(financial_activity, dict):
        financial_activity = {}

    if not isinstance(company_health, dict):
        company_health = {}

    if len(open_actions) > 5:
        signals.append("ACTION_OVERLOAD_RISK")

    if financial_activity.get("late_payments", 0) > 0:
        signals.append("CASHFLOW_RISK")

    if company_health.get("compliance_due_days", 999) < 10:
        signals.append("COMPLIANCE_URGENT")

    return signals