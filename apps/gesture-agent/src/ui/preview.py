import cv2
import time
from typing import Optional, List, Dict, Any
import numpy as np
from ..vision.drawing import draw_landmarks, draw_hud

class PreviewWindow:
    def __init__(self, window_name: str = "EduGesture 3D - Gesture Agent"):
        self.window_name = window_name
        self.last_frame_time = time.time()
        self.fps = 30.0

    def show(
        self,
        frame: np.ndarray,
        landmarks: Optional[List[Dict[str, float]]],
        gesture_name: Optional[str],
        confidence: float,
        server_status: str,
        session_code: str,
        mode: str = "DEBUG"
    ) -> Optional[str]:
        """
        Render preview frame with overlays and handle keyboard input.
        Returns key action: 'quit', 'reset', or None.
        """
        now = time.time()
        dt = now - self.last_frame_time
        if dt > 0:
            current_fps = 1.0 / dt
            self.fps = self.fps * 0.9 + current_fps * 0.1
        self.last_frame_time = now

        display_frame = frame.copy()

        # Draw hand landmarks if detected
        if landmarks:
            draw_landmarks(display_frame, landmarks)

        # Draw HUD status overlay
        draw_hud(
            display_frame,
            gesture_name=gesture_name,
            confidence=confidence,
            fps=self.fps,
            server_status=server_status,
            session_code=session_code,
            mode=mode
        )

        cv2.imshow(self.window_name, display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key in [ord('q'), 27]: # 'q' or ESC
            return 'quit'
        elif key == ord('r'):
            return 'reset'

        return None

    def close(self):
        cv2.destroyAllWindows()
