import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers: dict):
    """Test creating a project."""
    response = await client.post(
        "/api/projects",
        json={
            "name": "Test Project",
            "description": "A test project",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers: dict):
    """Test listing projects."""
    # Create a project first
    await client.post(
        "/api/projects",
        json={"name": "Project 1"},
        headers=auth_headers,
    )
    await client.post(
        "/api/projects",
        json={"name": "Project 2"},
        headers=auth_headers,
    )

    # List projects
    response = await client.get("/api/projects", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers: dict):
    """Test getting a specific project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
        headers=auth_headers,
    )
    project_id = create_response.json()["id"]

    # Get the project
    response = await client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert "nodes" in data
    assert "connections" in data


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers: dict):
    """Test updating a project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "Original Name"},
        headers=auth_headers,
    )
    project_id = create_response.json()["id"]

    # Update the project
    response = await client.put(
        f"/api/projects/{project_id}",
        json={"name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, auth_headers: dict):
    """Test deleting a project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "To Delete"},
        headers=auth_headers,
    )
    project_id = create_response.json()["id"]

    # Delete the project
    response = await client.delete(
        f"/api/projects/{project_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify it's gone
    get_response = await client.get(
        f"/api/projects/{project_id}",
        headers=auth_headers,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_project_unauthorized(client: AsyncClient):
    """Test project endpoints without auth."""
    response = await client.get("/api/projects")
    assert response.status_code == 403
