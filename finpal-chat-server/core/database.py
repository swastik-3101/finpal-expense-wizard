from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.mongo_uri)
    print("✅ Connected to MongoDB")

async def close_db():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")

def get_db():
    return client["finpal"]