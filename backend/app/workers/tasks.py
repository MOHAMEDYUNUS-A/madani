import uuid
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.pdf_generator import PDFGeneratorService

@celery_app.task(name="app.workers.tasks.generate_pdf_batch_task")
def generate_pdf_batch_task(batch_id: str):
    """
    Celery worker task to compile vector PDF batch sheets with crop marks and duplex mirroring.
    """
    db = SessionLocal()
    try:
        batch_uuid = uuid.UUID(batch_id)
        PDFGeneratorService.generate_pdf_batch(db=db, batch_id=batch_uuid)
        return {"status": "success", "batch_id": batch_id}
    except Exception as exc:
        return {"status": "failed", "error": str(exc), "batch_id": batch_id}
    finally:
        db.close()

@celery_app.task(name="app.workers.tasks.worker_health_check")
def worker_health_check():
    """Liveness probe task for Celery worker."""
    return {"status": "ok", "message": "Madani Celery worker is healthy"}
