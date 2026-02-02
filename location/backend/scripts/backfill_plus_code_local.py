"""
Backfill Script for plus_code_local Field

Populates the plus_code_local field for all existing addresses and postal zones
that have a plus_code but are missing plus_code_local.

Usage:
    python -m scripts.backfill_plus_code_local --dry-run
    python -m scripts.backfill_plus_code_local
"""

import argparse
import asyncio
import sys

# Add parent directory to path for imports
sys.path.insert(0, '.')

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.address import Address
from app.models.postal_zone import PostalZone
from app.services.plus_code import PlusCodeService


async def backfill_addresses(db: AsyncSession, dry_run: bool = False, batch_size: int = 500) -> dict:
    """
    Backfill plus_code_local for all addresses.

    Args:
        db: Database session
        dry_run: If True, don't actually update records
        batch_size: Number of records to process per batch

    Returns:
        Dictionary with counts
    """
    print("\n--- Backfilling Addresses ---")

    # Find addresses with plus_code but missing plus_code_local
    stmt = select(Address).where(
        Address.plus_code.isnot(None),
        Address.plus_code_local.is_(None)
    )

    result = await db.execute(stmt)
    addresses = result.scalars().all()

    total = len(addresses)
    updated = 0
    skipped = 0
    errors = 0

    print(f"Found {total} addresses to backfill")

    for i, addr in enumerate(addresses):
        try:
            local_code = PlusCodeService.extract_local_code(addr.plus_code)

            if local_code:
                if dry_run:
                    if updated < 5:  # Show first 5 examples
                        print(f"  [DRY-RUN] {addr.pda_id}: {addr.plus_code} -> {local_code}")
                else:
                    addr.plus_code_local = local_code
                updated += 1
            else:
                skipped += 1
                if skipped <= 3:
                    print(f"  Skipped {addr.pda_id}: Could not extract local code from {addr.plus_code}")

            # Commit in batches
            if not dry_run and (i + 1) % batch_size == 0:
                await db.commit()
                print(f"  Progress: {i + 1}/{total}")

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Error updating {addr.pda_id}: {e}")

    if not dry_run and updated > 0:
        await db.commit()

    return {
        "total": total,
        "updated": updated,
        "skipped": skipped,
        "errors": errors
    }


async def backfill_zones(db: AsyncSession, dry_run: bool = False) -> dict:
    """
    Backfill plus_code_local for all postal zones.

    Args:
        db: Database session
        dry_run: If True, don't actually update records

    Returns:
        Dictionary with counts
    """
    print("\n--- Backfilling Postal Zones ---")

    # Find zones with plus_code but missing plus_code_local
    stmt = select(PostalZone).where(
        PostalZone.plus_code.isnot(None),
        PostalZone.plus_code_local.is_(None)
    )

    result = await db.execute(stmt)
    zones = result.scalars().all()

    total = len(zones)
    updated = 0
    skipped = 0
    errors = 0

    print(f"Found {total} zones to backfill")

    for zone in zones:
        try:
            local_code = PlusCodeService.extract_local_code(zone.plus_code)

            if local_code:
                if dry_run:
                    if updated < 5:  # Show first 5 examples
                        print(f"  [DRY-RUN] {zone.zone_code}: {zone.plus_code} -> {local_code}")
                else:
                    zone.plus_code_local = local_code
                updated += 1
            else:
                skipped += 1
                if skipped <= 3:
                    print(f"  Skipped {zone.zone_code}: Could not extract local code from {zone.plus_code}")

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Error updating {zone.zone_code}: {e}")

    if not dry_run and updated > 0:
        await db.commit()

    return {
        "total": total,
        "updated": updated,
        "skipped": skipped,
        "errors": errors
    }


async def run_backfill(dry_run: bool = False, batch_size: int = 500):
    """
    Run the full backfill process.

    Args:
        dry_run: If True, only simulate without updating records
        batch_size: Number of records to commit per batch
    """
    print(f"\n{'='*60}")
    print("Plus Code Local Backfill")
    print(f"{'='*60}")
    print(f"Dry run: {dry_run}")
    print(f"Batch size: {batch_size}")
    print(f"{'='*60}")

    async with AsyncSessionLocal() as db:
        # Backfill addresses
        addr_results = await backfill_addresses(db, dry_run, batch_size)

        # Backfill zones
        zone_results = await backfill_zones(db, dry_run)

        # Print summary
        print(f"\n{'='*60}")
        print("Summary")
        print(f"{'='*60}")

        print("\nAddresses:")
        print(f"  Total found: {addr_results['total']}")
        print(f"  Updated: {addr_results['updated']}")
        print(f"  Skipped: {addr_results['skipped']}")
        print(f"  Errors: {addr_results['errors']}")

        print("\nPostal Zones:")
        print(f"  Total found: {zone_results['total']}")
        print(f"  Updated: {zone_results['updated']}")
        print(f"  Skipped: {zone_results['skipped']}")
        print(f"  Errors: {zone_results['errors']}")

        if dry_run:
            print("\n[DRY RUN] No records were updated. Run without --dry-run to apply changes.")
        else:
            total_updated = addr_results['updated'] + zone_results['updated']
            print(f"\nTotal records updated: {total_updated}")


def main():
    parser = argparse.ArgumentParser(
        description="Backfill plus_code_local field for existing records"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate without updating records"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Records per commit batch (default: 500)"
    )

    args = parser.parse_args()

    asyncio.run(run_backfill(
        dry_run=args.dry_run,
        batch_size=args.batch_size
    ))


if __name__ == "__main__":
    main()
