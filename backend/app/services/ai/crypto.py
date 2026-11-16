from __future__ import annotations

import base64
import hashlib
from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet_key() -> bytes:
    if settings.fernet_key and len(settings.fernet_key.strip()) > 0:
        return settings.fernet_key.strip().encode()
    # Deterministically derive 32-byte urlsafe key from settings.secret_key
    digest = hashlib.sha256(settings.secret_key.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plain_text: str | None) -> str | None:
    if not plain_text:
        return None
    f = Fernet(_get_fernet_key())
    return f.encrypt(plain_text.encode()).decode()


def decrypt_secret(encrypted_text: str | None) -> str | None:
    if not encrypted_text:
        return None
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return None
