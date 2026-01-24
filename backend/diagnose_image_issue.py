#!/usr/bin/env python3
"""
Quick diagnostic script for image upload/display issues
Run: python diagnose_image_issue.py
"""

import sys
import os
from pathlib import Path

def check_environment():
    """Check environment variables and configuration"""
    print("🔍 DIAGNOSTIC: Image Upload & Display Issue\n")
    print("=" * 60)
    print("STEP 1: Checking Environment Configuration")
    print("=" * 60)
    
    required_vars = {
        'GOOGLE_CLOUD_PROJECT': os.getenv('GOOGLE_CLOUD_PROJECT'),
        'GCS_BUCKET': os.getenv('GCS_BUCKET'),
        'GOOGLE_APPLICATION_CREDENTIALS': os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
    }
    
    all_set = True
    for var, value in required_vars.items():
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET")
            all_set = False
    
    if not all_set:
        print("\n⚠️  Some environment variables are missing!")
        print("   Make sure you're running from the backend directory")
        print("   and that .env file exists with all required values.\n")
        return False
    
    # Check if credentials file exists
    creds_path = required_vars['GOOGLE_APPLICATION_CREDENTIALS']
    if creds_path and not Path(creds_path).exists():
        print(f"\n❌ Credentials file not found: {creds_path}")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Looking for: {Path(creds_path).absolute()}")
        return False
    
    print(f"✅ Credentials file exists: {creds_path}\n")
    return True


def check_bucket_cors():
    """Check if CORS is configured on the bucket"""
    print("=" * 60)
    print("STEP 2: Checking GCS Bucket CORS Configuration")
    print("=" * 60)
    
    try:
        from google.cloud import storage
        from app.config import settings
        
        client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        bucket = client.bucket(settings.GCS_BUCKET)
        
        if not bucket.exists():
            print(f"❌ Bucket does not exist: {settings.GCS_BUCKET}\n")
            return False
        
        print(f"✅ Bucket exists: {settings.GCS_BUCKET}")
        
        bucket.reload()
        if bucket.cors:
            print("✅ CORS is configured:")
            for i, rule in enumerate(bucket.cors, 1):
                origins = rule.get('origin', [])
                methods = rule.get('method', [])
                print(f"\n   Rule {i}:")
                print(f"     Origins: {', '.join(origins)}")
                print(f"     Methods: {', '.join(methods)}")
                
                # Check if localhost:3000 is allowed
                if any('localhost:3000' in origin for origin in origins):
                    print(f"     ✅ Frontend origin (localhost:3000) is allowed")
                else:
                    print(f"     ⚠️  Frontend origin (localhost:3000) NOT in allowed origins")
                    print(f"     💡 Add 'http://localhost:3000' to origins")
            print()
            return True
        else:
            print("❌ CORS is NOT configured on the bucket")
            print("\n💡 This is the root cause of the image display issue!")
            print("   Images upload successfully but browser blocks them due to CORS.\n")
            print("🔧 TO FIX: Run this command:")
            print("   python setup_cors.py\n")
            return False
            
    except Exception as e:
        print(f"❌ Error checking CORS: {e}\n")
        return False


def check_signed_url_permissions():
    """Check if service account can generate signed URLs"""
    print("=" * 60)
    print("STEP 3: Checking Signed URL Generation")
    print("=" * 60)
    
    try:
        from google.cloud import storage
        from datetime import timedelta
        from app.config import settings
        
        client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        bucket = client.bucket(settings.GCS_BUCKET)
        
        # Create a test blob (without uploading)
        test_blob = bucket.blob("test-signing/test.txt")
        
        # Try to generate signed URL
        signed_url = test_blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=5),
            method="GET",
        )
        
        print("✅ Signed URL generation works!")
        print(f"   Test URL: {signed_url[:80]}...\n")
        return True
        
    except Exception as e:
        print(f"❌ Signed URL generation failed: {e}")
        print("\n💡 Service account may lack 'Service Account Token Creator' role")
        print("🔧 TO FIX: Run this command (replace SERVICE_ACCOUNT_EMAIL):")
        print("   gcloud iam service-accounts add-iam-policy-binding \\")
        print("     SERVICE_ACCOUNT_EMAIL \\")
        print("     --role=roles/iam.serviceAccountTokenCreator\n")
        return False


def print_summary(cors_ok, signing_ok):
    """Print diagnostic summary and next steps"""
    print("=" * 60)
    print("DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    if cors_ok and signing_ok:
        print("✅ All checks passed!")
        print("\nIf images still don't display:")
        print("  1. Clear browser cache (Cmd/Ctrl + Shift + R)")
        print("  2. Check browser console for errors")
        print("  3. Verify image URL in browser network tab")
        print("  4. Run: python test_storage.py (for detailed test)\n")
    else:
        print("\n⚠️  Issues found:\n")
        if not cors_ok:
            print("❌ CORS NOT CONFIGURED - This is blocking image display")
            print("   Fix: python setup_cors.py\n")
        if not signing_ok:
            print("❌ SIGNED URL GENERATION FAILED")
            print("   Fix: Add Token Creator role to service account\n")
        
        print("📋 Quick Fix Steps:")
        print("  1. cd backend")
        if not cors_ok:
            print("  2. python setup_cors.py")
        if not signing_ok:
            print("  3. Grant 'Service Account Token Creator' role")
        print("  4. Restart backend server")
        print("  5. Clear browser cache and retry upload\n")


def main():
    """Run all diagnostics"""
    # Check we're in the right directory
    if not Path('.env').exists() and Path('backend/.env').exists():
        print("⚠️  Please run from the backend directory:")
        print("   cd backend && python diagnose_image_issue.py\n")
        sys.exit(1)
    
    # Run checks
    env_ok = check_environment()
    if not env_ok:
        print("\n❌ Environment configuration failed. Fix the issues above and retry.\n")
        sys.exit(1)
    
    cors_ok = check_bucket_cors()
    signing_ok = check_signed_url_permissions()
    
    print_summary(cors_ok, signing_ok)
    
    # Exit with appropriate code
    if cors_ok and signing_ok:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
