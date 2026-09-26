from dataclasses import dataclass

@dataclass
class CameraConfig:
    camera_index: int = 0
    width: int = 640
    height: int = 480
    fps: int = 30
    mirror: bool = True
