import cv2
import logging
from typing import Optional, Tuple
import numpy as np
from .camera_config import CameraConfig

logger = logging.getLogger(__name__)

class Camera:
    def __init__(self, config: Optional[CameraConfig] = None):
        self.config = config or CameraConfig()
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False

    def start(self) -> bool:
        """Open camera capture with given settings."""
        logger.info(f"Opening camera index {self.config.camera_index}...")
        import platform
        backend = cv2.CAP_DSHOW if platform.system() == "Windows" else cv2.CAP_ANY
        self.cap = cv2.VideoCapture(self.config.camera_index, backend)

        if not self.cap.isOpened():
            # Fallback to default backend if CAP_DSHOW failed
            self.cap = cv2.VideoCapture(self.config.camera_index)
            if not self.cap.isOpened():
                logger.error(f"Failed to open camera index {self.config.camera_index}")
                return False

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
        self.cap.set(cv2.CAP_PROP_FPS, self.config.fps)

        self.is_running = True
        logger.info(f"Camera opened successfully ({self.config.width}x{self.config.height} @ {self.config.fps}fps)")
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Read a single frame from webcam, applying mirror mode if configured."""
        if not self.is_running or self.cap is None:
            return False, None

        success, frame = self.cap.read()
        if not success or frame is None:
            logger.warning("Frame read failed or camera disconnected")
            return False, None

        if self.config.mirror:
            frame = cv2.flip(frame, 1)

        return True, frame

    def restart(self) -> bool:
        """Restart camera capture."""
        logger.info("Restarting camera...")
        self.stop()
        return self.start()

    def stop(self):
        """Clean shutdown of camera resources."""
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        logger.info("Camera closed cleanly")
