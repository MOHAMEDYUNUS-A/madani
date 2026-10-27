import os
import uuid
import shutil
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps
import io

from app.core.config import settings

class StorageService:
    @staticmethod
    def validate_file(file: UploadFile, max_size_mb: int = 5) -> None:
        # Validate extension
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".xlsx", ".csv", ".zip"}
        filename, ext = os.path.splitext(file.filename.lower())
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension {ext} not allowed."
            )
        
        # Check size (requires seeking, then resetting pointer)
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
        
        if size > max_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed of {max_size_mb} MB."
            )

    @staticmethod
    def process_and_save_photo(
        file: UploadFile,
        org_id: str,
        crop_box: Optional[Tuple[int, int, int, int]] = None
    ) -> Tuple[str, str]:
        """
        Original -> Validate -> Normalize EXIF -> Crop/Resize -> Thumbnail -> Save
        Returns: (cropped_photo_url, original_photo_url)
        """
        StorageService.validate_file(file)
        
        # Build local paths
        org_dir = os.path.join(settings.STORAGE_DIR, org_id, "photos")
        os.makedirs(org_dir, exist_ok=True)
        
        file_uuid = str(uuid.uuid4())
        ext = os.path.splitext(file.filename.lower())[1]
        
        orig_filename = f"{file_uuid}_orig{ext}"
        cropped_filename = f"{file_uuid}_opt.png" # Store processed as PNG for high quality
        
        orig_path = os.path.join(org_dir, orig_filename)
        cropped_path = os.path.join(org_dir, cropped_filename)
        
        # Read file content into memory
        content = file.file.read()
        file.file.seek(0)
        
        # Save original file
        with open(orig_path, "wb") as f:
            f.write(content)
            
        try:
            # Process image using Pillow
            image = Image.open(io.BytesIO(content))
            
            # Normalize orientation (EXIF rotate)
            image = ImageOps.exif_transpose(image)
            
            # Apply crop if coordinates provided
            if crop_box:
                image = image.crop(crop_box)
                
            # Convert color space if necessary
            if image.mode in ("RGBA", "P"):
                # Retain transparency if needed, or convert to RGB
                pass
                
            # Save standard high-quality version (resize to max 800 width/height maintaining aspect)
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
            image.save(cropped_path, "PNG")
            
        except Exception as e:
            # If processing fails (e.g. invalid image format), clean up and raise error
            if os.path.exists(orig_path):
                os.remove(orig_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process image: {str(e)}"
            )

        # Generate URLs/paths
        orig_url = f"/storage/{org_id}/photos/{orig_filename}"
        cropped_url = f"/storage/{org_id}/photos/{cropped_filename}"
        
        return cropped_url, orig_url

    @staticmethod
    def save_generic_file(file: UploadFile, org_id: str, subfolder: str = "files") -> str:
        StorageService.validate_file(file)
        
        dest_dir = os.path.join(settings.STORAGE_DIR, org_id, subfolder)
        os.makedirs(dest_dir, exist_ok=True)
        
        file_uuid = str(uuid.uuid4())
        ext = os.path.splitext(file.filename.lower())[1]
        dest_filename = f"{file_uuid}{ext}"
        dest_path = os.path.join(dest_dir, dest_filename)
        
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return f"/storage/{org_id}/{subfolder}/{dest_filename}"
        
    @staticmethod
    def delete_file(file_url: str) -> bool:
        if not file_url.startswith("/storage/"):
            return False
        
        # Convert url to local path
        relative_path = file_url.replace("/storage/", "", 1)
        local_path = os.path.join(settings.STORAGE_DIR, relative_path)
        
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                return True
            except OSError:
                return False
        return False
