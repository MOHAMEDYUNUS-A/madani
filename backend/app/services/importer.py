import os
import zipfile
import tempfile
import io
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from typing import Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime

from app.models.member import Member, Department
from app.models.organization import Organization
from app.services.storage import StorageService
from app.services.audit import AuditService

class ImportService:
    @staticmethod
    def parse_excel_or_csv(file: UploadFile) -> pd.DataFrame:
        filename = file.filename.lower()
        content = file.file.read()
        file.file.seek(0)
        
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.StringIO(content.decode("utf-8")))
            else:
                df = pd.read_excel(io.BytesIO(content))
            return df
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format. Could not parse data table: {str(e)}"
            )

    @staticmethod
    def import_members_task(
        db: Session,
        organization_id: UUID,
        df: pd.DataFrame,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Processes and validates Excel/CSV rows in a batch transaction.
        Enforces tenant uniqueness and logs detailed validation reports.
        """
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise ValueError("Organization not found.")

        # Expected headers
        # Student ID, Admission Number, Name, Department, Designation, Class, Section, Year, Roll Number, DOB, Gender, Blood Group, Phone, Email, Address, Parent Name, Emergency Contact, Joining Date, Expiry Date
        total_records = len(df)
        valid_records = []
        errors = []
        duplicate_count = 0
        error_count = 0

        # Pre-fetch existing member_ids and departments for speed
        existing_member_ids = {
            m[0] for m in db.query(Member.member_id).filter(
                Member.organization_id == organization_id,
                Member.deleted_at == None
            ).all()
        }

        # Keep track of departments (name -> id)
        dept_cache = {
            d.name.lower().strip(): d.id for d in db.query(Department).filter(
                Department.organization_id == organization_id
            ).all()
        }

        # Track duplicates inside the current file to prevent multiple inserts
        file_member_ids = set()

        for idx, row in df.iterrows():
            row_num = idx + 2 # Excel starts at 1, headers are row 1
            
            # Clean row values
            row_data = {k: (str(v).strip() if pd.notna(v) else None) for k, v in row.items()}
            
            member_id = row_data.get("Student ID")
            name = row_data.get("Name")
            
            if not member_id:
                error_count += 1
                errors.append(f"Row {row_num}: Missing required field 'Student ID'")
                continue
            if not name:
                error_count += 1
                errors.append(f"Row {row_num}: Missing required field 'Name'")
                continue

            # Duplicate check inside file
            if member_id in file_member_ids:
                duplicate_count += 1
                errors.append(f"Row {row_num}: Duplicate Student ID '{member_id}' inside upload file")
                continue
            file_member_ids.add(member_id)

            # Duplicate check in DB
            if member_id in existing_member_ids:
                duplicate_count += 1
                errors.append(f"Row {row_num}: Student ID '{member_id}' already exists in organization database")
                continue

            # Resolve Department
            dept_name = row_data.get("Department")
            dept_id = None
            if dept_name:
                dept_name_clean = dept_name.strip()
                dept_key = dept_name_clean.lower()
                if dept_key in dept_cache:
                    dept_id = dept_cache[dept_key]
                else:
                    # Auto-create department if it does not exist
                    new_dept = Department(organization_id=organization_id, name=dept_name_clean)
                    db.add(new_dept)
                    db.commit()
                    db.refresh(new_dept)
                    dept_id = new_dept.id
                    dept_cache[dept_key] = dept_id

            # Parse dates helper
            def parse_date(date_str):
                if not date_str:
                    return None
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S"):
                    try:
                        # Extract date part if datetime
                        clean_str = date_str.split(" ")[0]
                        return datetime.strptime(clean_str, fmt).date()
                    except ValueError:
                        continue
                return None

            dob = parse_date(row_data.get("DOB"))
            joining_date = parse_date(row_data.get("Joining Date"))
            expiry_date = parse_date(row_data.get("Expiry Date"))

            # Create member
            member = Member(
                organization_id=organization_id,
                member_id=member_id,
                admission_number=row_data.get("Admission Number"),
                name=name,
                dob=dob,
                gender=row_data.get("Gender"),
                blood_group=row_data.get("Blood Group"),
                department_id=dept_id,
                designation=row_data.get("Designation"),
                class_name=row_data.get("Class"),
                section=row_data.get("Section"),
                academic_year=row_data.get("Year"),
                roll_number=row_data.get("Roll Number"),
                phone=row_data.get("Phone"),
                email=row_data.get("Email"),
                address=row_data.get("Address"),
                parent_name=row_data.get("Parent Name"),
                emergency_contact=row_data.get("Emergency Contact"),
                joining_date=joining_date,
                expiry_date=expiry_date,
                status="PENDING"
            )
            db.add(member)
            valid_records.append(member)

        # Commit only valid rows
        db.commit()

        AuditService.log(
            db=db,
            action="Bulk Excel Import Processed",
            entity="members",
            user_id=user_id,
            organization_id=organization_id,
            new_values={
                "total_records": total_records,
                "valid_inserted": len(valid_records),
                "duplicates": duplicate_count,
                "errors_count": error_count
            }
        )

        return {
            "total_records": total_records,
            "valid_count": len(valid_records),
            "duplicate_count": duplicate_count,
            "error_count": error_count,
            "errors": errors
        }

    @staticmethod
    def match_zip_photos(
        db: Session,
        organization_id: UUID,
        zip_file: UploadFile,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Extracts ZIP, matches images to student record IDs (filenames like MAM001.jpg),
        processes images, and updates DB URLs.
        """
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise ValueError("Organization not found.")

        # Create temp folder for extraction
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, "upload.zip")
        
        try:
            with open(zip_path, "wb") as f:
                f.write(zip_file.file.read())
                
            with zipfile.ZipFile(zip_path, 'r') as ref:
                ref.extractall(temp_dir)
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Failed to decompress ZIP archive: {str(e)}")

        # Fetch all files
        all_files = []
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    all_files.append(os.path.join(root, file))

        matched_count = 0
        unmatched_count = 0
        invalid_count = 0
        details = []

        # Process each image file
        for file_path in all_files:
            filename = os.path.basename(file_path)
            basename, ext = os.path.splitext(filename)
            clean_id = basename.strip()

            # Search member by member_id or admission_number
            member = db.query(Member).filter(
                Member.organization_id == organization_id,
                (Member.member_id == clean_id) | (Member.admission_number == clean_id),
                Member.deleted_at == None
            ).first()

            if not member:
                unmatched_count += 1
                details.append(f"Unmatched: Photo {filename} does not match any Student ID or Admission Number.")
                continue

            try:
                # Mock a fastapi UploadFile structure for the crop service
                with open(file_path, "rb") as image_f:
                    from fastapi.datastructures import UploadFile as FastAPIUploadFile
                    # Read into memory
                    img_data = image_f.read()
                    
                    mock_upload = FastAPIUploadFile(
                        filename=filename,
                        file=io.BytesIO(img_data)
                    )
                    
                    # Normalize & save
                    cropped_url, original_url = StorageService.process_and_save_photo(
                        file=mock_upload,
                        org_id=org.org_id
                    )

                # Remove old photos if existing
                if member.photo_url: StorageService.delete_file(member.photo_url)
                if member.photo_original_url: StorageService.delete_file(member.photo_original_url)

                # Update database
                member.photo_url = cropped_url
                member.photo_original_url = original_url
                
                matched_count += 1
                details.append(f"Matched & Updated: {filename} mapped to Student ID '{member.member_id}'")
            except Exception as ex:
                invalid_count += 1
                details.append(f"Error processing {filename}: {str(ex)}")

        db.commit()
        shutil.rmtree(temp_dir, ignore_errors=True)

        AuditService.log(
            db=db,
            action="Bulk ZIP Photos Matched",
            entity="members",
            user_id=user_id,
            organization_id=organization_id,
            new_values={
                "total_photos_found": len(all_files),
                "matched": matched_count,
                "unmatched": unmatched_count,
                "invalid": invalid_count
            }
        )

        return {
            "total_photos": len(all_files),
            "matched_count": matched_count,
            "unmatched_count": unmatched_count,
            "invalid_count": invalid_count,
            "details": details
        }
