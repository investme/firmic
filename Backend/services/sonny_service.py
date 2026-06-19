from models.company import Company
from database import SessionLocal
import openai

openai.api_key = "YOUR_API_KEY"


def get_company_context(company_id: str):
    db = SessionLocal()

    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        return None

    return {
        "name": company.name,
        "status": company.status,
        "country": company.country,
        "business_type": company.business_type
    }


def ask_sonny(company_id: str, question: str):

    context = get_company_context(company_id)

    if not context:
        return "Company not found."

    prompt = f"""
You are Sonny, a business operating system assistant.

You help users understand their company status and next steps.

Company Context:
- Name: {context['name']}
- Status: {context['status']}
- Country: {context['country']}
- Business Type: {context['business_type']}

User Question:
{question}

Rules:
- Be simple and clear
- Explain status in human terms
- Give next step advice
- Do NOT mention backend systems or APIs
"""

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response["choices"][0]["message"]["content"]