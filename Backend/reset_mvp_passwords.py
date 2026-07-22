from database import SessionLocal
from firmic_models import User
from auth import hash_password


def reset_mvp_accounts():
    db = SessionLocal()

    try:
        admin = (
            db.query(User)
            .filter(User.email == "hussein@firmic.io")
            .first()
        )

        tenant = (
            db.query(User)
            .filter(User.email == "hmatar63@gmail.com")
            .first()
        )

        if not admin:
            print("Admin user not found.")
        else:
            admin.password_hash = hash_password("admin123")
            admin.role = "admin"
            print("Admin account updated.")

        if not tenant:
            print("Tenant user not found.")
        else:
            tenant.password_hash = hash_password("Firmic123")
            tenant.role = "tenant"
            print("Tenant account updated.")

        db.commit()
        print("MVP authentication accounts are ready.")

    except Exception as error:
        db.rollback()
        print("Failed to update MVP accounts:", error)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    reset_mvp_accounts()