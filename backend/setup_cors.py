#!/usr/bin/env python3
"""
Script to configure CORS on Google Cloud Storage bucket
Run: python setup_cors.py
"""

from google.cloud import storage
from app.config import settings

def setup_bucket_cors():
    """Configure CORS on the GCS bucket to allow frontend access"""
    
    client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
    bucket = client.bucket(settings.GCS_BUCKET)
    
    # Define CORS configuration
    cors_configuration = [
        {
            "origin": [
                "http://localhost:3000",
                "http://localhost:8000",
                "https://yourdomain.com",  # Replace with your production domain
            ],
            "method": ["GET", "HEAD", "OPTIONS"],
            "responseHeader": [
                "Content-Type",
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Headers",
            ],
            "maxAgeSeconds": 3600,
        }
    ]
    
    bucket.cors = cors_configuration
    bucket.patch()
    
    print(f"✅ CORS configured successfully for bucket: {settings.GCS_BUCKET}")
    print(f"   Allowed origins: {cors_configuration[0]['origin']}")
    print(f"   Allowed methods: {cors_configuration[0]['method']}")
    
    # Verify configuration
    bucket.reload()
    print(f"\n📋 Current CORS configuration:")
    for i, rule in enumerate(bucket.cors, 1):
        print(f"   Rule {i}:")
        print(f"     Origins: {rule.get('origin', [])}")
        print(f"     Methods: {rule.get('method', [])}")
        print(f"     Max Age: {rule.get('maxAgeSeconds', 0)}s")


if __name__ == "__main__":
    try:
        print("🔧 Setting up CORS for GCS bucket...")
        setup_bucket_cors()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure:")
        print("  1. GOOGLE_APPLICATION_CREDENTIALS is set correctly in .env")
        print("  2. Service account has 'Storage Admin' role")
        print("  3. Bucket name in .env is correct")
