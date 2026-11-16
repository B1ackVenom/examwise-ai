from __future__ import annotations

import time

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    needs_rehash,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("MySecretPass1")
        assert hashed != "MySecretPass1"
        assert len(hashed) > 20

    def test_verify_correct_password(self):
        hashed = hash_password("MySecretPass1")
        assert verify_password("MySecretPass1", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("MySecretPass1")
        assert verify_password("WrongPassword1", hashed) is False

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("MySecretPass1")
        h2 = hash_password("MySecretPass1")
        # Argon2 uses random salt — hashes must differ
        assert h1 != h2

    def test_needs_rehash_returns_bool(self):
        hashed = hash_password("MySecretPass1")
        result = needs_rehash(hashed)
        assert isinstance(result, bool)


class TestJWT:
    def test_create_and_decode(self):
        token = create_access_token("user-123", {"role": "student"})
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"
        assert payload["role"] == "student"
        assert payload["type"] == "access"

    def test_decode_invalid_token_raises(self):
        with pytest.raises(JWTError):
            decode_access_token("not.a.valid.token")

    def test_access_token_has_exp(self):
        token = create_access_token("user-456")
        payload = decode_access_token(token)
        assert "exp" in payload
        assert payload["exp"] > time.time()
