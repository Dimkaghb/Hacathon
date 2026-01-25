#!/usr/bin/env python3
"""
Test script for video generation and extension flow.

This script:
1. Registers/logs in as user@example.com
2. Creates a new project
3. Generates a video (text-to-video)
4. Extends the generated video
"""

import asyncio
import httpx
import time
from typing import Optional, Dict, Any


BASE_URL = "http://localhost:8000"
EMAIL = "user@example.com"
PASSWORD = "password123"


class VideoFlowTester:
    def __init__(self):
        self.token: Optional[str] = None
        self.project_id: Optional[str] = None
        self.video_node_id: Optional[str] = None
        self.video_url: Optional[str] = None

    async def register_or_login(self) -> str:
        """Register or login user and return access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try to register first
            try:
                response = await client.post(
                    f"{BASE_URL}/api/auth/register",
                    json={"email": EMAIL, "password": PASSWORD}
                )
                if response.status_code == 201:
                    data = response.json()
                    print(f"✓ Registered new user: {EMAIL}")
                    return data["access_token"]
            except Exception as e:
                print(f"  Registration failed (might already exist): {e}")

            # Try login
            response = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": EMAIL, "password": PASSWORD}
            )
            response.raise_for_status()
            data = response.json()
            print(f"✓ Logged in as: {EMAIL}")
            return data["access_token"]

    async def create_project(self) -> str:
        """Create a new project and return project_id."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE_URL}/api/projects",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "name": "Video Extension Test",
                    "description": "Testing video generation and extension"
                }
            )
            response.raise_for_status()
            data = response.json()
            print(f"✓ Created project: {data['name']} (ID: {data['id']})")
            return data["id"]

    async def create_video_node(self) -> str:
        """Create a video node in the project."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE_URL}/api/projects/{self.project_id}/nodes",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "type": "video",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "prompt": "A beautiful sunset over the ocean with gentle waves",
                        "resolution": "720p",
                        "duration": 4
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            print(f"✓ Created video node (ID: {data['id']})")
            return data["id"]

    async def generate_video(self) -> str:
        """Generate a video and return the video URL."""
        print("\n⏳ Generating video (this may take 1-3 minutes)...")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Start video generation
            response = await client.post(
                f"{BASE_URL}/api/ai/generate-video",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "node_id": self.video_node_id,
                    "prompt": "A beautiful sunset over the ocean with gentle waves, cinematic 4K quality",
                    "resolution": "720p",
                    "aspect_ratio": "16:9",
                    "duration": 4,
                    "num_videos": 1,
                    "use_fast_model": False
                }
            )
            response.raise_for_status()
            job_data = response.json()
            job_id = job_data["job_id"]
            print(f"  Started generation job: {job_id}")

            # Poll for completion
            max_wait = 360  # 6 minutes
            start_time = time.time()

            while time.time() - start_time < max_wait:
                await asyncio.sleep(5)

                response = await client.get(
                    f"{BASE_URL}/api/ai/jobs/{job_id}",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                response.raise_for_status()
                status_data = response.json()

                status = status_data["status"]
                progress = status_data.get("progress", 0)

                if status == "completed":
                    video_url = status_data["result"]["video_url"]
                    print(f"✓ Video generated successfully!")
                    print(f"  Video URL: {video_url}")
                    return video_url
                elif status == "failed":
                    error = status_data.get("error", "Unknown error")
                    raise Exception(f"Video generation failed: {error}")
                else:
                    print(f"  Progress: {progress}% - {status}")

            raise Exception("Video generation timed out")

    async def extend_video(self) -> str:
        """Extend the generated video and return the extended video URL."""
        print("\n⏳ Extending video (this may take 1-3 minutes)...")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create a new node for the extension
            response = await client.post(
                f"{BASE_URL}/api/projects/{self.project_id}/nodes",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "type": "video",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "prompt": "Continue with more ocean waves at sunset",
                        "source_video": self.video_url
                    }
                }
            )
            response.raise_for_status()
            extension_node = response.json()
            extension_node_id = extension_node["id"]
            print(f"  Created extension node: {extension_node_id}")

            # Start video extension
            response = await client.post(
                f"{BASE_URL}/api/ai/extend-video",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "node_id": extension_node_id,
                    "video_url": self.video_url,
                    "prompt": "Continue with more ocean waves rolling onto the beach at sunset",
                    "extension_count": 1
                }
            )
            response.raise_for_status()
            job_data = response.json()
            job_id = job_data["job_id"]
            print(f"  Started extension job: {job_id}")

            # Poll for completion
            max_wait = 360  # 6 minutes
            start_time = time.time()

            while time.time() - start_time < max_wait:
                await asyncio.sleep(5)

                response = await client.get(
                    f"{BASE_URL}/api/ai/jobs/{job_id}",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                response.raise_for_status()
                status_data = response.json()

                status = status_data["status"]
                progress = status_data.get("progress", 0)

                if status == "completed":
                    extended_url = status_data["result"]["video_url"]
                    print(f"✓ Video extended successfully!")
                    print(f"  Extended video URL: {extended_url}")
                    return extended_url
                elif status == "failed":
                    error = status_data.get("error", "Unknown error")
                    raise Exception(f"Video extension failed: {error}")
                else:
                    print(f"  Progress: {progress}% - {status}")

            raise Exception("Video extension timed out")

    async def run_full_flow(self):
        """Run the complete video generation and extension flow."""
        try:
            print("=" * 60)
            print("VIDEO GENERATION & EXTENSION FLOW TEST")
            print("=" * 60)
            print()

            # Step 1: Authentication
            print("1. Authenticating...")
            self.token = await self.register_or_login()
            print()

            # Step 2: Create project
            print("2. Creating project...")
            self.project_id = await self.create_project()
            print()

            # Step 3: Create video node
            print("3. Creating video node...")
            self.video_node_id = await self.create_video_node()
            print()

            # Step 4: Generate video
            print("4. Generating video...")
            self.video_url = await self.generate_video()
            print()

            # Step 5: Extend video
            print("5. Extending video...")
            extended_url = await self.extend_video()
            print()

            print("=" * 60)
            print("✓ FULL FLOW COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print()
            print(f"Original video: {self.video_url}")
            print(f"Extended video: {extended_url}")
            print()
            print("The encoding error has been fixed! ✨")

        except Exception as e:
            print()
            print("=" * 60)
            print("✗ FLOW FAILED")
            print("=" * 60)
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            raise


async def main():
    tester = VideoFlowTester()
    await tester.run_full_flow()


if __name__ == "__main__":
    asyncio.run(main())
