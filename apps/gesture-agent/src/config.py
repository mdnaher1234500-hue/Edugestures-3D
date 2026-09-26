import os
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    server_url: str = Field(default="http://localhost:4000", alias="SERVER_URL")
    api_url: str = Field(default="http://localhost:4000/api", alias="API_URL")
    teacher_email: str = Field(default="teacher@edugesture.com", alias="TEACHER_EMAIL")
    teacher_password: str = Field(default="password123", alias="TEACHER_PASSWORD")
    session_code: str = Field(default="DEMO01", alias="SESSION_CODE")

    camera_index: int = Field(default=0, alias="CAMERA_INDEX")
    frame_width: int = Field(default=640, alias="FRAME_WIDTH")
    frame_height: int = Field(default=480, alias="FRAME_HEIGHT")
    fps: int = Field(default=30, alias="FPS")
    mirror_mode: bool = Field(default=True, alias="MIRROR_MODE")

    confidence_threshold: float = Field(default=0.7, alias="CONFIDENCE_THRESHOLD")
    pinch_threshold: float = Field(default=0.06, alias="PINCH_THRESHOLD")
    dead_zone: float = Field(default=0.015, alias="DEAD_ZONE")
    rotate_sensitivity: float = Field(default=1.8, alias="ROTATE_SENSITIVITY")
    zoom_sensitivity: float = Field(default=2.5, alias="ZOOM_SENSITIVITY")
    stability_frames: int = Field(default=4, alias="STABILITY_FRAMES")
    command_cooldown: float = Field(default=0.05, alias="COMMAND_COOLDOWN")
    mode: str = Field(default="DEBUG", alias="MODE")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
