"""
Quick script to add new node types to the database
Run this with: python apply_migration.py
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_node_types():
    async with engine.begin() as conn:
        print("Adding new node types to database...")
        
        # Add new enum values
        await conn.execute(text("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'container'"))
        print("✓ Added 'container' node type")
        
        await conn.execute(text("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'ratio'"))
        print("✓ Added 'ratio' node type")
        
        await conn.execute(text("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'scene'"))
        print("✓ Added 'scene' node type")
        
        print("\n✅ All new node types added successfully!")

if __name__ == "__main__":
    asyncio.run(add_node_types())
