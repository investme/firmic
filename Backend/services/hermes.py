from services.compliance_requirements import (
    applicable_compliance_requirements,
    document_matches_requirement,
)


APPROVED_STATUSES = {
    "approved",
    "verified",
    "complete",
    "completed",
}


def _norm(value):
    return str(value or "").strip().lower()


def generate_compliance_report(
    company,
    documents,
    tasks,
):
    requirements = applicable_compliance_requirements(
        company
    )

    missing_documents = []

    for requirement in requirements:
        matches = [
            document
            for document in documents
            if document_matches_requirement(
                document,
                requirement,
            )
        ]

        if not matches:
            missing_documents.append(
                requirement["label"]
            )

    completed_tasks = len(
        [
            task
            for task in tasks
            if _norm(task.status)
            in {
                "completed",
                "complete",
                "done",
                "closed",
            }
        ]
    )

    total_tasks = len(tasks)

    score = 100

    if requirements:
        document_ratio = (
            len(requirements) - len(missing_documents)
        ) / len(requirements)
        score = round(score * document_ratio)

    if total_tasks > 0:
        score = round(
            score
            * (
                completed_tasks
                / total_tasks
            )
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
