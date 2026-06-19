def build_business_context(company_data, actions, documents, transactions):

    return {
        "company_health": company_data,
        "open_actions": actions,
        "recent_documents": documents,
        "financial_activity": transactions,
    }