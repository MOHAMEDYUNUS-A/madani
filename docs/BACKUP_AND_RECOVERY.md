# Database Backup, Disaster Recovery & PITR Runbook

## 1. Recovery Objectives

| Metric | Target SLA | Strategy |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **<= 1 hour** | Hourly snapshot backups + continuous Write-Ahead Log (WAL) archiving |
| **Recovery Time Objective (RTO)** | **<= 15 minutes** | Automated containerized restore runbook using `scripts/restore_db.py` |

---

## 2. Automated Backup System (`scripts/backup_db.py`)

The platform includes a native, automated database backup utility supporting compressed PostgreSQL `pg_dump` and local SQLite dumps with timestamp metadata and retention rotation.

### Executing a Backup Manually
```bash
# Capture full database snapshot with optional tag
python scripts/backup_db.py --tag "pre-deploy"
```

### Automated Backup Schedule (Cron / CI)
In production, backups execute automatically via a cron container or system cron:
```crontab
# Hourly snapshot at minute 0
0 * * * * cd /opt/madani && python scripts/backup_db.py --tag "hourly" >> /var/log/madani-backup.log 2>&1

# Daily backup at 02:00 UTC with 30-day retention
0 2 * * * cd /opt/madani && python scripts/backup_db.py --tag "daily" >> /var/log/madani-backup.log 2>&1
```

### Snapshot Storage Structure
Backups are saved in the configured backup directory:
```text
/opt/madani/backups/
├── db_snapshot_20261027_120000_hourly.sql.gz
├── db_snapshot_20261027_130000_hourly.sql.gz
└── db_snapshot_20261027_pre-deploy.sql.gz
```

---

## 3. Database Restoration System (`scripts/restore_db.py`)

### Restoring from the Latest Snapshot
To recover quickly from a failed deployment or data issue:
```bash
python scripts/restore_db.py --latest-snapshot
```

### Restoring from a Specific Backup File
```bash
python scripts/restore_db.py --file /opt/madani/backups/db_snapshot_20261027_120000_hourly.sql.gz
```

### Interactive Confirmation Safeguard
When running in production, the restore script requires explicit confirmation (`--confirm`) to prevent accidental overwrites.

---

## 4. Disaster Recovery Scenarios & Runbooks

### Scenario A: Accidental Table Dropped or Data Corrupted
1. Put application into maintenance mode:
   ```bash
   docker compose -f docker-compose.prod.yml stop backend
   ```
2. Identify the closest clean backup captured before the incident:
   ```bash
   python scripts/restore_db.py --list-snapshots
   ```
3. Restore the target snapshot:
   ```bash
   python scripts/restore_db.py --file backups/<target_snapshot> --confirm
   ```
4. Start backend and execute smoke test:
   ```bash
   docker compose -f docker-compose.prod.yml start backend
   python scripts/smoke_test.py --backend-url http://127.0.0.1:8000
   ```

### Scenario B: Full Host Infrastructure Failure
1. Provision new host with Docker and Docker Compose installed.
2. Clone repository:
   ```bash
   git clone https://github.com/MOHAMEDYUNUS-A/madani.git /opt/madani
   cd /opt/madani
   ```
3. Copy environment configuration `.env` and restore offsite backup bundle from S3/storage:
   ```bash
   aws s3 cp s3://madani-backups/latest-db.sql.gz backups/
   ```
4. Start database container and restore schema:
   ```bash
   docker compose -f docker-compose.prod.yml up -d db redis
   python scripts/restore_db.py --latest-snapshot --confirm
   ```
5. Launch full production stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   python scripts/smoke_test.py --backend-url http://127.0.0.1:8000
   ```
