from models.company import Company


def evaluate_company(company, tasks, documents):

    all_tasks_done = all(
        task.status == "completed"
        for task in tasks
    )

    if all_tasks_done and len(documents) > 0:
        company.status = "active"

    return company.status