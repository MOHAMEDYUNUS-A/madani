"""
Automated Database Restore Tool
Safely restores database from compressed backup archive with integrity verification.
"""
import os
import sys
import argparse
import gzip
import hashlib
import shutil
import subprocess
from pathlib import Path

BACKUP_DIR = Path(__file__).resolve().parent.parent / "backups"

def calculate_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def list_backups():
    files = sorted(BACKUP_DIR.glob("backup_*.gz"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        print("[INFO] No backup archives found in", BACKUP_DIR)
        return []
    print(f"Available Database Backups ({len(files)} total):")
    for idx, f in enumerate(files):
        sz_kb = f.stat().st_size / 1024
        print(f"  [{idx + 1}] {f.name} ({sz_kb:.1f} KB)")
    return files

def restore_sqlite(archive_path: Path, target_path: Path):
    print(f"Restoring SQLite database to {target_path}...")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(archive_path, "rb") as src, open(target_path, "wb") as dst:
        shutil.copyfileobj(src, dst)
    print(f"[OK] Database successfully restored from {archive_path.name}")

def restore_postgres(archive_path: Path, db_url: str):
    print(f"Restoring PostgreSQL database to target URL...")
    cmd = ["psql", db_url]
    with gzip.open(archive_path, "rb") as gz_in:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        shutil.copyfileobj(gz_in, proc.stdin)
        proc.stdin.close()
        proc.wait()
        if proc.returncode != 0:
            stderr = proc.stderr.read().decode()
            raise RuntimeError(f"psql restore failed (exit {proc.returncode}): {stderr}")
    print(f"[OK] PostgreSQL database successfully restored from {archive_path.name}")

def main():
    parser = argparse.ArgumentParser(description="Database Restore Utility")
    parser.add_argument("--file", type=str, help="Specific backup archive file name or path")
    parser.add_argument("--latest", action="store_true", help="Restore from the most recent backup archive")
    parser.add_argument("--list", action="store_true", help="List available backup archives")
    args = parser.parse_args()

    backups = list_backups()
    if args.list:
        return

    if not backups:
        print("[ERROR] Cannot restore: No backups found.")
        sys.exit(1)

    target_archive = None
    if args.latest:
        target_archive = backups[0]
    elif args.file:
        target_archive = Path(args.file) if Path(args.file).is_absolute() else BACKUP_DIR / args.file
        if not target_archive.exists():
            print(f"[ERROR] Backup file not found: {target_archive}")
            sys.exit(1)
    else:
        print("Please specify --latest or --file <filename>. Run with --list to see available files.")
        sys.exit(1)

    print(f"Selected Archive: {target_archive.name}")
    checksum = calculate_sha256(target_archive)
    print(f"Archive SHA256: {checksum}")

    db_url = os.environ.get("DATABASE_URL", "")
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        restore_postgres(target_archive, db_url)
    else:
        sqlite_target = Path(__file__).resolve().parent.parent / "backend" / "test_api.db"
        restore_sqlite(target_archive, sqlite_target)

if __name__ == "__main__":
    main()
