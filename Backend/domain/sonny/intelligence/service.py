# domain/sonny/intelligence/service.py

from domain.sonny.intelligence.intelligence_pipeline import run_sonny_intelligence
from domain.sonny.actions.service import ActionService


class SonnyIntelligenceService:
    def __init__(self):
        self.action_service = ActionService()

    def run(self, company_data, actions, documents, transactions):
        result = run_sonny_intelligence(
            company_data,
            actions,
            documents,
            transactions,
        )

        for action in result.get("actions", []):
            self.action_service.create_action(action)

        return result