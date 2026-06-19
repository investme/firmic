from infrastructure.queue.redis import queue_action
from infrastructure.db.models import ActionTable


class ActionService:

    def create_action(self, action: dict):
        """
        Create action in DB + push to queue
        """

        # Save to DB (if your model is ready)
        db_action = ActionTable(**action)

        # Send to Redis queue
        queue_action(action)

        return {
            "status": "created",
            "action": action
        }

    def approve_action(self, action_id: str):
        return {
            "action_id": action_id,
            "status": "approved"
        }

    def execute_action(self, action_id: str):
        queue_action({
            "action_id": action_id,
            "execute": True
        })

        return {
            "action_id": action_id,
            "status": "queued_for_execution"
        }