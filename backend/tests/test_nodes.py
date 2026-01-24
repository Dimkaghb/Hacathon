import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_node(client: AsyncClient, auth_headers: dict):
    """Test creating a node."""
    # Create a project first
    project_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
        headers=auth_headers,
    )
    project_id = project_response.json()["id"]

    # Create a node
    response = await client.post(
        f"/api/projects/{project_id}/nodes",
        json={
            "type": "image",
            "position_x": 100,
            "position_y": 200,
            "data": {"image_url": "https://example.com/image.jpg"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "image"
    assert data["position_x"] == 100
    assert data["position_y"] == 200


@pytest.mark.asyncio
async def test_list_nodes(client: AsyncClient, auth_headers: dict):
    """Test listing nodes in a project."""
    # Create a project
    project_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
        headers=auth_headers,
    )
    project_id = project_response.json()["id"]

    # Create nodes
    await client.post(
        f"/api/projects/{project_id}/nodes",
        json={"type": "image", "data": {}},
        headers=auth_headers,
    )
    await client.post(
        f"/api/projects/{project_id}/nodes",
        json={"type": "prompt", "data": {}},
        headers=auth_headers,
    )

    # List nodes
    response = await client.get(
        f"/api/projects/{project_id}/nodes",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_update_node(client: AsyncClient, auth_headers: dict):
    """Test updating a node."""
    # Create a project and node
    project_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
        headers=auth_headers,
    )
    project_id = project_response.json()["id"]

    node_response = await client.post(
        f"/api/projects/{project_id}/nodes",
        json={"type": "prompt", "position_x": 0, "position_y": 0, "data": {}},
        headers=auth_headers,
    )
    node_id = node_response.json()["id"]

    # Update the node
    response = await client.put(
        f"/api/projects/{project_id}/nodes/{node_id}",
        json={"position_x": 500, "position_y": 300},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["position_x"] == 500
    assert response.json()["position_y"] == 300


@pytest.mark.asyncio
async def test_delete_node(client: AsyncClient, auth_headers: dict):
    """Test deleting a node."""
    # Create a project and node
    project_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
        headers=auth_headers,
    )
    project_id = project_response.json()["id"]

    node_response = await client.post(
        f"/api/projects/{project_id}/nodes",
        json={"type": "video", "data": {}},
        headers=auth_headers,
    )
    node_id = node_response.json()["id"]

    # Delete the node
    response = await client.delete(
        f"/api/projects/{project_id}/nodes/{node_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204
