from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestSignup:
    async def test_signup_success(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "student@test.com",
                "password": "Password1",
                "full_name": "Test Student",
                "role": "student",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        assert "refresh_token" in resp.cookies

    async def test_signup_duplicate_email(self, client: AsyncClient):
        payload = {
            "email": "dup@test.com",
            "password": "Password1",
            "full_name": "Dup User",
            "role": "student",
        }
        resp1 = await client.post("/api/v1/auth/signup", json=payload)
        assert resp1.status_code == 201
        resp2 = await client.post("/api/v1/auth/signup", json=payload)
        assert resp2.status_code == 409

    async def test_signup_weak_password(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "weak@test.com",
                "password": "password",  # no uppercase, no digit
                "full_name": "Weak User",
                "role": "student",
            },
        )
        assert resp.status_code == 422

    async def test_signup_invalid_role(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "admin@test.com",
                "password": "Password1",
                "full_name": "Fake Admin",
                "role": "admin",  # not allowed via signup
            },
        )
        assert resp.status_code == 422

    async def test_signup_invalid_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "not-an-email",
                "password": "Password1",
                "full_name": "Bad Email",
                "role": "student",
            },
        )
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "login@test.com",
                "password": "Password1",
                "full_name": "Login User",
                "role": "teacher",
            },
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "login@test.com", "password": "Password1"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert "refresh_token" in resp.cookies

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "wrongpass@test.com",
                "password": "Password1",
                "full_name": "WP User",
                "role": "student",
            },
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "wrongpass@test.com", "password": "WrongPass1"},
        )
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@test.com", "password": "Password1"},
        )
        assert resp.status_code == 401


class TestRefreshAndLogout:
    async def test_refresh_token_rotation(self, client: AsyncClient):
        signup_resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "refresh_user@test.com",
                "password": "Password1",
                "full_name": "Refresh User",
                "role": "student",
            },
        )
        assert signup_resp.status_code == 201
        refresh_cookie = signup_resp.cookies.get("refresh_token")
        assert refresh_cookie is not None

        # Refresh using cookie
        resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_cookie},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        new_refresh = resp.cookies.get("refresh_token")
        assert new_refresh is not None
        assert new_refresh != refresh_cookie

        # Old refresh token should now be revoked (reuse detection)
        reuse_resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_cookie},
        )
        assert reuse_resp.status_code == 401

    async def test_logout_revokes_token(self, client: AsyncClient):
        signup_resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "logout_user@test.com",
                "password": "Password1",
                "full_name": "Logout User",
                "role": "student",
            },
        )
        refresh_cookie = signup_resp.cookies.get("refresh_token")

        # Logout
        logout_resp = await client.post(
            "/api/v1/auth/logout",
            cookies={"refresh_token": refresh_cookie},
        )
        assert logout_resp.status_code == 204

        # Attempting refresh after logout should fail
        refresh_resp = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_cookie},
        )
        assert refresh_resp.status_code == 401


class TestMe:
    async def test_me_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 403

    async def test_me_returns_profile(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "me@test.com",
                "password": "Password1",
                "full_name": "Me User",
                "role": "student",
            },
        )
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "me@test.com", "password": "Password1"},
        )
        token = login.json()["access_token"]
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@test.com"
        assert data["role"] == "student"
        assert "hashed_password" not in data

    async def test_update_me_profile(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "profile@test.com",
                "password": "Password1",
                "full_name": "Before Update",
                "role": "teacher",
            },
        )
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "profile@test.com", "password": "Password1"},
        )
        token = login.json()["access_token"]
        resp = await client.patch(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "After Update",
                "bio": "Senior Computer Science Lecturer",
                "avatar_url": "https://example.com/avatar.png",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "After Update"
        assert data["bio"] == "Senior Computer Science Lecturer"
        assert data["avatar_url"] == "https://example.com/avatar.png"


class TestHealth:
    async def test_health_ok(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
