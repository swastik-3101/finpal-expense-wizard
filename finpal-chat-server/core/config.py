from pydantic_settings import BaseSettings
 
class Settings(BaseSettings):
    groq_api_key: str
    mongo_uri: str = "mongodb://localhost:27017/finpal"
    jwt_secret: str
    chat_server_port: int = 8001
 
    class Config:
        env_file = ".env"
 
settings = Settings()
 