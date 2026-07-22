from sqlalchemy.orm import Session
from models.sonny_memory import SonnyMemory


VALID_MEMORY_TYPES = {
    "company",
    "conversation",
    "decision",
    "preference",
    "workflow",
    "document",
    "task",
    "meeting",
    "knowledge",
}


def normalize_memory_type(memory_type: str) -> str:
    memory_type = memory_type.lower().strip()

    if memory_type not in VALID_MEMORY_TYPES:
        return "knowledge"

    return memory_type


def add_memory(
    db: Session,
    company_id: str,
    memory_type: str,
    title: str,
    content: str,
    source: str = "sonny",
):
    memory = SonnyMemory(
        company_id=company_id,
        memory_type=normalize_memory_type(memory_type),
        title=title.strip(),
        content=content.strip(),
        source=source,
    )

    db.add(memory)
    db.commit()
    db.refresh(memory)

    return memory


def get_memories(
    db: Session,
    company_id: str,
    memory_type: str | None = None,
    limit: int = 20,
):
    query = db.query(SonnyMemory).filter(
        SonnyMemory.company_id == company_id
    )

    if memory_type:
        query = query.filter(
            SonnyMemory.memory_type == normalize_memory_type(memory_type)
        )

    return (
        query.order_by(SonnyMemory.created_at.desc())
        .limit(limit)
        .all()
    )


def classify_memory(message: str):
    text = message.lower()

    if any(word in text for word in ["we are", "our company", "business is", "startup", "industry"]):
        return {
            "memory_type": "company",
            "title": "Company profile update",
        }

    if any(word in text for word in ["remember", "always", "prefer", "from now on"]):
        return {
            "memory_type": "preference",
            "title": "Founder preference",
        }

    if any(word in text for word in ["we decided", "decision", "agreed", "choose", "chosen"]):
        return {
            "memory_type": "decision",
            "title": "Founder decision",
        }

    if any(word in text for word in ["task", "todo", "next step", "follow up"]):
        return {
            "memory_type": "task",
            "title": "Task-related context",
        }

    if any(word in text for word in ["document", "license", "kyb", "contract", "agreement"]):
        return {
            "memory_type": "document",
            "title": "Document-related context",
        }

    return {
        "memory_type": "conversation",
        "title": "Conversation note",
    }


def remember_founder_message(
    db: Session,
    company_id: str,
    message: str,
):
    classification = classify_memory(message)

    return add_memory(
        db=db,
        company_id=company_id,
        memory_type=classification["memory_type"],
        title=classification["title"],
        content=message,
        source="founder",
    )


def format_memories_for_prompt(memories):
    if not memories:
        return "No saved company memory yet."

    return "\n".join(
        f"- [{memory.memory_type.upper()}] {memory.title}: {memory.content}"
        for memory in memories
    )