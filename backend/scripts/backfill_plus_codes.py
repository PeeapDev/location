"""
Script to backfill Plus Codes for existing addresses.
Run this after applying the database migration.

Usage: python -m scripts.backfill_plus_codes
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.address import Address
from app.services.plus_code import PlusCodeService
from app.core.config import settings


async def backfill_plus_codes(batch_size: int = 100):
    """Backfill Plus Codes for all addresses missing them."""

    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Get addresses without Plus Codes
        stmt = select(Address).where(Address.plus_code.is_(None))
        result = await db.execute(stmt)
        addresses = result.scalars().all()

        total = len(addresses)
        processed = 0
        errors = 0

        print(f"Found {total} addresses without Plus Codes")

        if total == 0:
            print("No addresses to update.")
            return

        for address in addresses:
            try:
                # Generate full Plus Code (11 chars for ~3m precision)
                plus_code = PlusCodeService.encode(
                    address.latitude,
                    address.longitude,
                    code_length=11
                )

                # Update address
                address.plus_code = plus_code
                address.plus_code_short = plus_code[-6:]  # Last 6 chars

                processed += 1

                if processed % batch_size == 0:
                    await db.commit()
                    print(f"Processed {processed}/{total} addresses")

            except Exception as e:
                errors += 1
                print(f"Error processing {address.pda_id}: {e}")

        # Final commit
        await db.commit()
        print(f"\nCompleted: {processed}/{total} addresses updated")
        if errors:
            print(f"Errors: {errors}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(backfill_plus_codes())
