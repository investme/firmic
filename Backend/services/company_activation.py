"""
Legacy company activation compatibility service.

Company activation is controlled exclusively by the Firmic
compliance + Launch Engine approval pipeline. Completing tasks
or uploading documents must never activate a company directly.
"""


def evaluate_company(company, tasks, documents):
    """
    Legacy compatibility helper.

    This function intentionally performs no company-status
    mutation. Final activation is handled by the compliance
    approval and Launch Engine pipeline.
    """
    return company.status
