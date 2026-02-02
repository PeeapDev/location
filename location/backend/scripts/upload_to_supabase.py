"""
Upload Plus Code Grid to Supabase

Reads the GeoJSON file and uploads all Plus Code addresses to Supabase.
Works offline once the data is loaded.

Usage:
    Set environment variables first:
        SUPABASE_URL=https://your-project.supabase.co
        SUPABASE_SERVICE_KEY=your-service-role-key

    Then run:
        python -m scripts.upload_to_supabase
        python -m scripts.upload_to_supabase --batch-size 500
        python -m scripts.upload_to_supabase --dry-run
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Dict

# Check for required packages
try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)


def load_geojson(file_path: str) -> List[Dict]:
    """Load GeoJSON file and extract features."""
    print(f"Loading GeoJSON from: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    print(f"Loaded {len(features)} features")
    return features


def feature_to_record(feature: Dict) -> Dict:
    """Convert GeoJSON feature to database record."""
    props = feature['properties']
    geom = feature['geometry']

    return {
        'plus_code': props['plus_code'],
        'local_code': props['local_code'],
        'zone_type': props['zone_type'],
        'center_lat': props['center_lat'],
        'center_lon': props['center_lon'],
        'geometry': json.dumps(geom),  # Store as GeoJSON string
        'status': 'available'
    }


def upload_to_supabase(
    supabase: Client,
    features: List[Dict],
    batch_size: int = 500,
    dry_run: bool = False
):
    """Upload features to Supabase in batches."""
    total = len(features)
    uploaded = 0
    errors = 0

    print(f"\nUploading {total} records in batches of {batch_size}...")

    for i in range(0, total, batch_size):
        batch = features[i:i + batch_size]
        records = [feature_to_record(f) for f in batch]

        if dry_run:
            print(f"  [DRY RUN] Would upload batch {i // batch_size + 1}: {len(records)} records")
            uploaded += len(records)
            continue

        try:
            # Use upsert to handle duplicates
            result = supabase.table('plus_code_addresses').upsert(
                records,
                on_conflict='plus_code'
            ).execute()

            uploaded += len(records)
            progress = (uploaded / total) * 100
            print(f"  Uploaded {uploaded}/{total} ({progress:.1f}%)")

        except Exception as e:
            errors += 1
            print(f"  ERROR in batch {i // batch_size + 1}: {e}")
            if errors > 5:
                print("Too many errors, stopping.")
                break

    return uploaded, errors


def verify_upload(supabase: Client):
    """Verify the upload by checking counts."""
    print("\nVerifying upload...")

    # Get total count
    result = supabase.table('plus_code_addresses').select('*', count='exact').limit(1).execute()
    total = result.count

    # Get counts by zone type
    urban = supabase.table('plus_code_addresses').select('*', count='exact').eq('zone_type', 'urban').limit(1).execute()
    rural = supabase.table('plus_code_addresses').select('*', count='exact').eq('zone_type', 'rural').limit(1).execute()

    print(f"  Total records: {total}")
    print(f"  Urban: {urban.count}")
    print(f"  Rural: {rural.count}")

    return total


def main():
    parser = argparse.ArgumentParser(
        description="Upload Plus Code grid to Supabase"
    )
    parser.add_argument(
        "--input",
        default="data/freetown_pluscode_grid.geojson",
        help="Input GeoJSON file path"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Records per batch (default: 500)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate without uploading"
    )

    args = parser.parse_args()

    # Get Supabase credentials from environment
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials")
        print("Set these environment variables:")
        print("  SUPABASE_URL=https://your-project.supabase.co")
        print("  SUPABASE_SERVICE_KEY=your-service-role-key")
        print("\nOr create a .env file with these values.")
        sys.exit(1)

    print("=" * 60)
    print("Plus Code Grid Upload to Supabase")
    print("=" * 60)
    print(f"Supabase URL: {supabase_url}")
    print(f"Input file: {args.input}")
    print(f"Batch size: {args.batch_size}")
    print(f"Dry run: {args.dry_run}")
    print("=" * 60)

    # Find the input file
    input_path = Path(args.input)
    if not input_path.exists():
        # Try relative to script location
        script_dir = Path(__file__).parent.parent
        input_path = script_dir / args.input
        if not input_path.exists():
            print(f"ERROR: Input file not found: {args.input}")
            sys.exit(1)

    # Initialize Supabase client
    if not args.dry_run:
        print("\nConnecting to Supabase...")
        supabase = create_client(supabase_url, supabase_key)
        print("Connected!")
    else:
        supabase = None

    # Load GeoJSON
    features = load_geojson(str(input_path))

    if not features:
        print("ERROR: No features found in GeoJSON")
        sys.exit(1)

    # Upload
    uploaded, errors = upload_to_supabase(
        supabase,
        features,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total features: {len(features)}")
    print(f"Uploaded: {uploaded}")
    print(f"Errors: {errors}")

    if not args.dry_run and supabase:
        verify_upload(supabase)

    if args.dry_run:
        print("\n[DRY RUN] No data was uploaded. Run without --dry-run to upload.")


if __name__ == "__main__":
    main()
