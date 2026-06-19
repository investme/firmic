import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, db=0)

def process_action(action):
    print("Executing action:", action)

    if action.get("type") == "COMPLIANCE_ALERT":
        print("Triggering compliance workflow")

    if action.get("type") == "SERVICE_BOOKING":
        print("Connecting to provider system")

    if action.get("type") == "DOCUMENT_REQUEST":
        print("Generating document")

while True:
    _, data = r.brpop("sonny_actions")
    action = json.loads(data)

    process_action(action)

    time.sleep(1)