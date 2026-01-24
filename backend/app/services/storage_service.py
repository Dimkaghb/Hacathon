import asyncio
from typing import Optional
from google.cloud import storage
from google.oauth2 import service_account
from datetime import timedelta

from app.config import settings


class StorageService:
    def __init__(self):
        self._client = None
        self._bucket = None

    @property
    def client(self):
        if self._client is None:
            self._client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        return self._client

    @property
    def bucket(self):
        if self._bucket is None:
            self._bucket = self.client.bucket(settings.GCS_BUCKET)
        return self._bucket

    @property
    def bucket_name(self) -> str:
        return settings.GCS_BUCKET

    async def upload_file(
        self,
        file_data: bytes,
        object_name: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload a file to Google Cloud Storage.

        Args:
            file_data: File content as bytes
            object_name: Destination path in bucket
            content_type: MIME type of the file

        Returns:
            Signed download URL (valid for 1 year) for the uploaded file
        """
        loop = asyncio.get_event_loop()

        def _upload():
            blob = self.bucket.blob(object_name)
            blob.upload_from_string(file_data, content_type=content_type)
            # Generate a signed download URL (valid for 1 year)
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=365),
                method="GET",
            )
            return signed_url

        url = await loop.run_in_executor(None, _upload)
        return url

    async def download_file(self, gcs_uri: str) -> bytes:
        """
        Download a file from Google Cloud Storage.

        Args:
            gcs_uri: GCS URI (gs://bucket/path) or object name

        Returns:
            File content as bytes
        """
        # Parse GCS URI
        if gcs_uri.startswith("gs://"):
            parts = gcs_uri[5:].split("/", 1)
            bucket_name = parts[0]
            object_name = parts[1] if len(parts) > 1 else ""
        else:
            bucket_name = settings.GCS_BUCKET
            object_name = gcs_uri

        loop = asyncio.get_event_loop()

        def _download():
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(object_name)
            return blob.download_as_bytes()

        content = await loop.run_in_executor(None, _download)
        return content

    async def generate_upload_url(
        self,
        object_name: str,
        content_type: str = "application/octet-stream",
        expiration_minutes: int = 60,
    ) -> str:
        """
        Generate a signed URL for uploading a file directly.

        Args:
            object_name: Destination path in bucket
            content_type: Expected MIME type
            expiration_minutes: URL validity period

        Returns:
            Signed upload URL
        """
        loop = asyncio.get_event_loop()

        def _generate():
            blob = self.bucket.blob(object_name)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="PUT",
                content_type=content_type,
            )
            return url

        url = await loop.run_in_executor(None, _generate)
        return url

    async def generate_download_url(
        self,
        object_name: str,
        expiration_minutes: int = 60,
    ) -> str:
        """
        Generate a signed URL for downloading a file.

        Args:
            object_name: Path in bucket
            expiration_minutes: URL validity period

        Returns:
            Signed download URL
        """
        loop = asyncio.get_event_loop()

        def _generate():
            blob = self.bucket.blob(object_name)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="GET",
            )
            return url

        url = await loop.run_in_executor(None, _generate)
        return url

    async def delete_file(self, object_name: str) -> bool:
        """
        Delete a file from storage.

        Args:
            object_name: Path in bucket

        Returns:
            True if deleted, False if not found
        """
        loop = asyncio.get_event_loop()

        def _delete():
            blob = self.bucket.blob(object_name)
            if blob.exists():
                blob.delete()
                return True
            return False

        return await loop.run_in_executor(None, _delete)

    async def file_exists(self, object_name: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            object_name: Path in bucket

        Returns:
            True if exists
        """
        loop = asyncio.get_event_loop()

        def _exists():
            blob = self.bucket.blob(object_name)
            return blob.exists()

        return await loop.run_in_executor(None, _exists)

    async def list_files(self, prefix: str = "", max_results: int = 100) -> list:
        """
        List files in storage with a given prefix.

        Args:
            prefix: Path prefix to filter
            max_results: Maximum number of results

        Returns:
            List of object names
        """
        loop = asyncio.get_event_loop()

        def _list():
            blobs = self.client.list_blobs(
                settings.GCS_BUCKET,
                prefix=prefix,
                max_results=max_results,
            )
            return [blob.name for blob in blobs]

        return await loop.run_in_executor(None, _list)


storage_service = StorageService()
