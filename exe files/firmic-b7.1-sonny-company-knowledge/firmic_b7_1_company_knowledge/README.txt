FIRMIC B.7.1 — SONNY COMPANY KNOWLEDGE
======================================

Hussein, this package adds the first working Sonny Brain module.

FILES TO COPY
-------------
1. models/sonny_knowledge.py
   -> backend/models/sonny_knowledge.py

2. schemas/sonny_knowledge.py
   -> backend/schemas/sonny_knowledge.py

3. services/sonny/knowledge.py
   -> backend/services/sonny/knowledge.py

4. routes/sonny_brain.py
   -> backend/routes/sonny_brain.py

5. main.py
   -> replace your current backend/main.py

DATABASE
--------
Run sql/001_create_sonny_company_knowledge.sql against your active database.

PostgreSQL example:
    psql "$DATABASE_URL" -f sql/001_create_sonny_company_knowledge.sql

Or paste the SQL into pgAdmin Query Tool and run it once.

RESTART
-------
Restart FastAPI after copying the files.

SWAGGER TEST ORDER
------------------
1. GET /api/sonny/brain/company/{company_id}/knowledge
   Expected: HTTP 200 and an empty knowledge profile.

2. PUT /api/sonny/brain/company/{company_id}/knowledge
   Example body:
   {
     "company_summary": "Firmic is the operating system for AI-native companies.",
     "mission": "Help founders launch and operate companies with AI from day one.",
     "vision": "Become the Shopify of business infrastructure.",
     "industry": "Business infrastructure and AI operations",
     "services": "Virtual office, AI COO, digital mailroom, meeting rooms and business operations.",
     "communication_style": "Concise, calm, executive and practical.",
     "founder_notes": "Address the founder as Hussein."
   }

3. GET /api/sonny/brain/company/{company_id}/knowledge/context
   Expected: formatted prompt-ready company knowledge.

4. POST /api/sonny/brain/company/{company_id}/knowledge/import
   Example body:
   {
     "raw_text": "Mission:\nBuild the operating system for AI-native companies.\n\nPricing:\nSetup fee: $49.",
     "replace_existing_import": false
   }

NOTES
-----
- Knowledge is isolated by company_id.
- Owners and Firmic admins can access it.
- One knowledge profile exists per company.
- Import works without OpenAI and recognizes titled sections.
- This does not modify your current Sonny memory, decisions, workflows,
  automations or orchestration logic.
