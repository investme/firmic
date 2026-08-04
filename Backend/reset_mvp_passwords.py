from database import SessionLocal
from firmic_models import User
from auth import hash_password


ADMIN_EMAIL = "hussein@firmic.io"
ADMIN_PASSWORD = "admin123"

TENANT_EMAIL = "hmatar63@gmail.com"
TENANT_PASSWORD = "Firmic123"


def reset_mvp_accounts():
    db = SessionLocal()

    try:
        # -------------------------
        # ADMIN
        # -------------------------
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
            print("✅ Admin account created.")
        else:
            admin.full_name = "Firmic Administrator"
            admin.password_hash = hash_password(ADMIN_PASSWORD)
            admin.role = "admin"
            print("✅ Admin account updated.")

        # -------------------------
        # TENANT
        # -------------------------
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
                role="tenant",
            )
            db.add(tenant)
            print("✅ Tenant account created.")
        else:
            tenant.password_hash = hash_password(TENANT_PASSWORD)
            tenant.role = "tenant"
            print("✅ Tenant account updated.")

        db.commit()
        print("🎉 MVP authentication accounts are ready.")

    except Exception as e:
        db.rollback()
        print("❌ Failed:", e)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    reset_mvp_accounts()