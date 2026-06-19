from .scoring_engine import calculate_action_score

class ActionEvaluator:

    def evaluate(self, feedback):

        score = calculate_action_score(feedback)

        return {
            "action_id": feedback.action_id,
            "score": score,
            "success": feedback.success
        }