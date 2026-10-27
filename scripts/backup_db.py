"""
Automated Database Backup Tool
Creates timestamped, compressed backups with SHA256 checksums and retention rotation.
"""
import os
import sys
import argparse
import datetime
import gzip
import hashlib
import shutil
import subprocess
from pathlib import Path

BACKUP_DIR = Path(__file__).resolve().parent.parent / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def calculate_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def backup_sqlite(db_file: Path, tag: str) -> Path:
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_name = f"backup_{tag}_{timestamp}.db.gz" if tag else f"backup_{timestamp}.db.gz"
    out_path = BACKUP_DIR / out_name

    with open(db_file, "rb") as src, gzip.open(out_path, "wb") as dst:
        shutil.copyfileobj(src, dst)

    checksum = calculate_sha256(out_path)
    print(f"[OK] SQLite backup created: {out_path.name} (SHA256: {checksum[:12]}...)")
    return out_path

def backup_postgres(db_url: str, tag: str) -> Path:
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_name = f"backup_pg_{tag}_{timestamp}.sql.gz" if tag else f"backup_pg_{timestamp}.sql.gz"
    out_path = BACKUP_DIR / out_name

    # Run pg_dump and stream to gzip
    cmd = ["pg_dump", db_url]
    with gzip.open(out_path, "wb") as gz_out:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        shutil.copyfileobj(proc.stdout, gz_out)
        proc.wait()
        if proc.returncode != 0:
            stderr = proc.stderr.read().decode()
            raise RuntimeError(f"pg_dump failed (exit {proc.returncode}): {stderr}")

    checksum = calculate_sha256(out_path)
    print(f"[OK] PostgreSQL backup created: {out_path.name} (SHA256: {checksum[:12]}...)")
    return out_path

def prune_old_backups(days_retention: int = 14):
    now = datetime.datetime.now(datetime.timezone.utc)
    for f in BACKUP_DIR.glob("backup_*"):
        file_mtime = datetime.datetime.fromtimestamp(f.stat().st_mtime, tz=datetime.timezone.utc)
        if (now - file_mtime).days > days_retention:
            print(f"[PRUNE] Removing backup older than {days_retention} days: {f.name}")
            f.unlink()

def main():
    parser = argparse.ArgumentParser(description="Automated DB Backup Utility")
    parser.add_argument("--tag", type=str, default="", help="Optional release or git tag identifier")
    parser.add_argument("--retention-days", type=int, default=14, help="Days to retain backup files")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL", "")
    
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        try:
            backup_postgres(db_url, args.tag)
        except Exception as e:
            print(f"[ERROR] Failed PostgreSQL backup: {e}")
            sys.exit(1)
    else:
        # SQLite mode fallback
        sqlite_path = Path(__file__).resolve().parent.parent / "backend" / "test_api.db"
        if not sqlite_path.exists():
            sqlite_path = Path(__file__).resolve().parent.parent / "backend" / "madani.db"
        if sqlite_path.exists():
            backup_sqlite(sqlite_path, args.tag)
        else:
            print(f"[WARN] No active DB found for backup at {sqlite_path}. Mocking snapshot check.")

    prune_old_backups(args.retention_days)

if __name__ == "__main__":
    main()
