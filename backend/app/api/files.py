from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.services.storage_service import storage_service

router = APIRouter()


@router.post("/upload")
async def get_upload_url(
    filename: str,
    content_type: str,
    current_user: User = Depends(get_current_user),
):
    """Get a signed URL for uploading a file directly to cloud storage"""
    file_id = str(uuid4())
    extension = filename.split(".")[-1] if "." in filename else ""
    object_name = f"uploads/{current_user.id}/{file_id}.{extension}"

    signed_url = await storage_service.generate_upload_url(
        object_name=object_name,
        content_type=content_type,
    )

    return {
        "upload_url": signed_url,
        "file_id": file_id,
        "object_name": object_name,
        "public_url": f"gs://{storage_service.bucket_name}/{object_name}",
    }


@router.post("/upload-direct")
async def upload_file_direct(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file directly through the API"""
    file_id = str(uuid4())
    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else ""
    object_name = f"uploads/{current_user.id}/{file_id}.{extension}"

    content = await file.read()
    url = await storage_service.upload_file(
        file_data=content,
        object_name=object_name,
        content_type=file.content_type or "application/octet-stream",
    )

    return {
        "file_id": file_id,
        "url": url,
        "object_name": object_name,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
    }


@router.get("/{file_id}")
async def get_download_url(
    file_id: str,
    object_name: str,
    current_user: User = Depends(get_current_user),
):
    """Get a signed URL for downloading a file"""
    # Verify user has access (file path should include user_id)
    if f"/{current_user.id}/" not in object_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    signed_url = await storage_service.generate_download_url(object_name=object_name)

    return {
        "download_url": signed_url,
        "file_id": file_id,
    }


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    object_name: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a file from storage"""
    # Verify user has access
    if f"/{current_user.id}/" not in object_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await storage_service.delete_file(object_name=object_name)

    return {"message": "File deleted", "file_id": file_id}
