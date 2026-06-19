def generate_reasoning(context, signals):

    reasoning = []

    for signal in signals:

        if signal == "COMPLIANCE_URGENT":
            reasoning.append({
                "insight": "Compliance deadline approaching",
                "confidence": 0.92,
                "risk_level": "high"
            })

        if signal == "CASHFLOW_RISK":
            reasoning.append({
                "insight": "Delayed payments affecting liquidity",
                "confidence": 0.85,
                "risk_level": "high"
            })

        if signal == "ACTION_OVERLOAD_RISK":
            reasoning.append({
                "insight": "Too many open actions reduce efficiency",
                "confidence": 0.78,
                "risk_level": "medium"
            })

    return reasoning