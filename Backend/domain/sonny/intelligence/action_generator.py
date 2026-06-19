def generate_actions(reasoning):

    actions = []

    for r in reasoning:

        if r["insight"] == "Compliance deadline approaching":

            actions.append({
                "type": "COMPLIANCE_ALERT",
                "title": "Prepare VAT Filing",
                "description": "Urgent preparation required for compliance",
                "priority": "high"
            })

        if r["insight"] == "Delayed payments affecting liquidity":

            actions.append({
                "type": "PAYMENT_DUE",
                "title": "Follow up on overdue invoices",
                "description": "Cashflow risk detected",
                "priority": "high"
            })

    return actions