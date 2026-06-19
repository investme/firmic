from .action_evaluator import ActionEvaluator

class SonnyLearningService:

    def __init__(self):
        self.evaluator = ActionEvaluator()

        # simple in-memory "model memory"
        self.memory = {
            "successful_patterns": [],
            "failed_patterns": []
        }

    def ingest_feedback(self, feedback):

        result = self.evaluator.evaluate(feedback)

        # STORE LEARNING PATTERN
        if result["success"] and result["score"] > 50:
            self.memory["successful_patterns"].append(result)

        if not result["success"]:
            self.memory["failed_patterns"].append(result)

        return {
            "learning_updated": True,
            "current_memory_size": len(self.memory["successful_patterns"])
        }