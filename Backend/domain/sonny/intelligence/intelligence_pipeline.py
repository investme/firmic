from .context_builder import build_business_context
from .analyzer import analyze_context
from .reasoning_engine import generate_reasoning
from .action_generator import generate_actions


def run_sonny_intelligence(company_data, actions, documents, transactions, memory=None):

    context = build_business_context(
        company_data,
        actions,
        documents,
        transactions
    )

    signals = analyze_context(context)

    reasoning = generate_reasoning(context, signals)

    if memory:
        for pattern in memory.get("successful_patterns", []):
            reasoning.append({
                "insight": "Previously successful pattern detected",
                "confidence": 0.95,
                "risk_level": "low"
            })

    new_actions = generate_actions(reasoning)

    return {
        "signals": signals,
        "reasoning": reasoning,
        "actions": new_actions
    }