def calculate_action_score(feedback):

    score = 0

    # success matters most
    if feedback.success:
        score += 50
    else:
        score -= 30

    # impact matters
    score += feedback.impact_score * 0.4

    # speed matters
    if feedback.delay_minutes < 60:
        score += 10
    elif feedback.delay_minutes > 1440:
        score -= 10

    return score