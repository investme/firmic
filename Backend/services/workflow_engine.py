from domain.sonny.intelligence.service import SonnyIntelligenceService


def run_company_workflow(company):
    sonny = SonnyIntelligenceService()

    result = sonny.run(
        company_data={
            "id": company.id,
            "name": company.name,
            "user_id": company.user_id,
            "status": company.status,
        },
        actions=[],
        documents=[],
        transactions=[],
    )

    return result