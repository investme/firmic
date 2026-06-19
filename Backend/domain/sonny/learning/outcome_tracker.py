from datetime import datetime

class OutcomeTracker:

    def record_outcome(self, action_id: str, outcome: dict):

        return {
            "action_id": action_id,
            "outcome_status": outcome.get("status"),
            "impact_score": outcome.get("impact_score", 0),
            "timestamp": datetime.utcnow()
        }