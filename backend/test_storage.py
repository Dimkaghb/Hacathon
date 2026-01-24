#!/usr/bin/env python3
"""
Script to test GCS bucket access and signed URL generation
Run: python test_storage.py
"""

import asyncio
import io
from datetime import timedelta
from google.cloud import storage
from app.config import settings

async def test_storage_setup():
    """Test GCS bucket access, upload, and signed URL generation"""
    
    print("🔍 Testing Google Cloud Storage setup...\n")
    
    try:
        # Initialize client
        print(f"📦 Project: {settings.GOOGLE_CLOUD_PROJECT}")
        print(f"📦 Bucket: {settings.GCS_BUCKET}")
        print(f"🔑 Credentials: {settings.GOOGLE_APPLICATION_CREDENTIALS}\n")
        
        client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        
        # Check bucket exists
        print("1️⃣ Checking bucket access...")
        bucket = client.bucket(settings.GCS_BUCKET)
        if bucket.exists():
            print(f"   ✅ Bucket exists and is accessible")
        else:
            print(f"   ❌ Bucket does not exist")
            return
        
        # Check bucket permissions
        print("\n2️⃣ Checking bucket IAM permissions...")
        permissions = [
            'storage.buckets.get',
            'storage.objects.create',
            'storage.objects.get',
            'storage.objects.list',
        ]
        allowed = bucket.test_iam_permissions(permissions)
        for perm in permissions:
            status = "✅" if perm in allowed else "❌"
            print(f"   {status} {perm}")
        
        # Test upload
        print("\n3️⃣ Testing file upload...")
        test_blob = bucket.blob("test-uploads/test-image.txt")
        test_content = b"Test image content"
        test_blob.upload_from_string(test_content, content_type="text/plain")
        print(f"   ✅ File uploaded successfully")
        
        # Test signed URL generation
        print("\n4️⃣ Testing signed URL generation...")
        try:
            signed_url = test_blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=60),
                method="GET",
            )
            print(f"   ✅ Signed URL generated successfully")
            print(f"   🔗 URL: {signed_url[:100]}...")
            
            # Test if URL is accessible
            import requests
            response = requests.head(signed_url, timeout=10)
            if response.status_code == 200:
                print(f"   ✅ Signed URL is accessible (HTTP {response.status_code})")
            else:
                print(f"   ⚠️  Signed URL returned HTTP {response.status_code}")
        except Exception as e:
            print(f"   ❌ Signed URL generation failed: {e}")
            print("\n   💡 Common causes:")
            print("      - Service account doesn't have 'Service Account Token Creator' role")
            print("      - Missing iam.serviceAccounts.signBlob permission")
            print("      - Run: gcloud iam service-accounts add-iam-policy-binding \\")
            print(f"              SERVICE_ACCOUNT_EMAIL \\")
            print("              --role=roles/iam.serviceAccountTokenCreator")
        
        # Check CORS configuration
        print("\n5️⃣ Checking CORS configuration...")
        bucket.reload()
        if bucket.cors:
            print(f"   ✅ CORS is configured:")
            for i, rule in enumerate(bucket.cors, 1):
                print(f"      Rule {i}:")
                print(f"        Origins: {rule.get('origin', [])}")
                print(f"        Methods: {rule.get('method', [])}")
        else:
            print(f"   ⚠️  CORS is NOT configured")
            print(f"   💡 Run: python setup_cors.py")
        
        # Cleanup
        print("\n6️⃣ Cleaning up test file...")
        test_blob.delete()
        print(f"   ✅ Test file deleted")
        
        print("\n✅ All tests passed! Storage is configured correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check .env file has correct values:")
        print(f"      - GOOGLE_CLOUD_PROJECT={settings.GOOGLE_CLOUD_PROJECT}")
        print(f"      - GCS_BUCKET={settings.GCS_BUCKET}")
        print(f"      - GOOGLE_APPLICATION_CREDENTIALS={settings.GOOGLE_APPLICATION_CREDENTIALS}")
        print("   2. Ensure service account JSON file exists at the credentials path")
        print("   3. Service account needs these roles:")
        print("      - Storage Admin (or Storage Object Admin)")
        print("      - Service Account Token Creator (for signed URLs)")


if __name__ == "__main__":
    asyncio.run(test_storage_setup())
