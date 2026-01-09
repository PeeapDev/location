"""Script to create the initial superadmin user."""

import asyncio
from app.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole, UserStatus
from app.services.security import SecurityService
from sqlalchemy import select


async def create_superadmin():
    """Create the initial superadmin user if not exists."""
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if superadmin already exists
        stmt = select(User).where(User.role == UserRole.SUPERADMIN.value)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Superadmin already exists: {existing.email}")
            return

        # Create superadmin
        superadmin = User(
            email="admin@xeeno.sl",
            hashed_password=SecurityService.hash_password("Admin123!"),
            full_name="System Administrator",
            phone="+232000000000",
            role=UserRole.SUPERADMIN.value,
            status=UserStatus.ACTIVE.value,
        )

        db.add(superadmin)
        await db.commit()

        print("=" * 50)
        print("Superadmin created successfully!")
        print("=" * 50)
        print(f"Email: admin@xeeno.sl")
        print(f"Password: Admin123!")
        print("=" * 50)
        print("Please change the password after first login!")


if __name__ == "__main__":
    asyncio.run(create_superadmin())
