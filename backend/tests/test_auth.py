import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    """Test user registration."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registration with duplicate email fails."""
    # First registration
    await client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )

    # Second registration with same email
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password456",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    """Test user login."""
    # Register first
    await client.post(
        "/api/auth/register",
        json={
            "email": "logintest@example.com",
            "password": "testpassword123",
        },
    )

    # Login
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "logintest@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password fails."""
    # Register first
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrongpass@example.com",
            "password": "correctpassword",
        },
    )

    # Login with wrong password
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "wrongpass@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict):
    """Test getting current user info."""
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    """Test getting current user without auth fails."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 403
