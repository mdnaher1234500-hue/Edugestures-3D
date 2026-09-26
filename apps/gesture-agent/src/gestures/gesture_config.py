from dataclasses import dataclass

@dataclass
class GestureConfig:
    confidence_threshold: float = 0.7
    pinch_threshold: float = 0.07
    dead_zone: float = 0.012
    rotate_sensitivity: float = 2.2
    zoom_sensitivity: float = 3.0
    gesture_stability_frames: int = 4
    command_cooldown: float = 0.04
