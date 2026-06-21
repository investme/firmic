from models.company import Document, Task


def generate_compliance_report(
    company,
    documents,
    tasks
):
    required_documents = [
        "Trade License",
        "Passport Copy",
        "Incorporation Certificate",
    ]

    uploaded_documents = [
    doc.name.strip().lower()
    for doc in documents
    ]

    missing_documents = []

    for document_name in required_documents:
        if (
        document_name.strip().lower()
        not in uploaded_documents
    ):
            missing_documents.append(document_name)

    completed_tasks = len(
        [t for t in tasks if t.status == "completed"]
    )

    total_tasks = len(tasks)

    score = 100

    score -= len(missing_documents) * 20

    if total_tasks > 0:
        score = round(
            score * (completed_tasks / total_tasks)
        )

    recommendations = []

    if missing_documents:
        recommendations.append(
            "Upload missing compliance documents"
        )

    if completed_tasks < total_tasks:
        recommendations.append(
            "Complete onboarding tasks"
        )

    return {
        "score": max(score, 0),
        "missing_documents": missing_documents,
        "recommendations": recommendations,
    }