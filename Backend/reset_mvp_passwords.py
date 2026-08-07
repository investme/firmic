from database import SessionLocal
from firmic_models import User
from auth import hash_password


ADMIN_EMAIL = "hussein@firmic.io"
ADMIN_PASSWORD = "admin123"

TENANT_EMAIL = "hmatar63@gmail.com"
TENANT_PASSWORD = "Firmic123"


def reset_mvp_accounts() -> None:
    db = SessionLocal()

    try:
        admin = (
            db.query(User)
            .filter(User.email == ADMIN_EMAIL)
            .first()
        )

        if admin is None:
            admin = User(
                full_name="Firmic Administrator",
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            print("Admin account created.")
        else:
            admin.full_name = "Firmic Administrator"
            admin.password_hash = hash_password(ADMIN_PASSWORD)
            admin.role = "admin"
            print("Admin account updated.")

        tenant = (
            db.query(User)
            .filter(User.email == TENANT_EMAIL)
            .first()
        )

        if tenant is None:
            tenant = User(
                full_name="MVP Tenant",
                email=TENANT_EMAIL,
                password_hash=hash_password(TENANT_PASSWORD),
                role="owner",
            )
            db.add(tenant)
            print("Tenant account created.")
        else:
            tenant.password_hash = hash_password(TENANT_PASSWORD)
            tenant.role = "owner"
            print("Tenant account updated.")

        db.commit()
        print("MVP authentication accounts are ready.")

    except Exception as error:
        db.rollback()
        print("Password reset failed:", error)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    reset_mvp_accounts()
