import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0)

QUEUE_NAME = "sonny_actions"

def queue_action(action: dict):
    r.lpush(QUEUE_NAME, json.dumps(action))