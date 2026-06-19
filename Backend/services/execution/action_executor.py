def execute_business_action(action):

    if action["type"] == "PAYMENT_DUE":
        return "Trigger payment API"

    if action["type"] == "PROVIDER_MATCH":
        return "Call marketplace matching engine"

    if action["type"] == "DOCUMENT_REQUEST":
        return "Generate PDF + store in S3"

    return "No handler found"