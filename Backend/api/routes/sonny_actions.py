from fastapi import APIRouter
from domain.sonny.actions.service import ActionService

router = APIRouter()
service = ActionService()

@router.post("/create")
def create_action(action: dict):
    return service.create_action(action)

@router.post("/{action_id}/approve")
def approve_action(action_id: str):
    return service.approve_action(action_id)

@router.post("/{action_id}/execute")
def execute_action(action_id: str):
    return service.execute_action(action_id)