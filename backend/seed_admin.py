#!/usr/bin/env python3
"""
One-time admin seeding script.

Usage (run from backend/ directory):
    python seed_admin.py --email admin@examwise.ai --password changeme123

Requires DATABASE_URL to be set in .env or environment.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def seed(email: str, password: str, full_name: str) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"[skip] Admin with email {email!r} already exists.")
            return

        admin = User(
            id=str(uuid.uuid4()),
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"[ok] Admin created: {email}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed an admin user")
    parser.add_argument("--email", default="admin@examwise.ai")
    parser.add_argument("--password", default="Admin123!")
    parser.add_argument("--name", default="Platform Admin")
    args = parser.parse_args()
    asyncio.run(seed(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
