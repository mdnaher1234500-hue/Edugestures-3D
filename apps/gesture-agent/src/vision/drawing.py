import cv2
from typing import List, Dict, Any, Optional
import numpy as np

# MediaPipe standard 21-point hand connections
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
    (0, 5), (5, 6), (6, 7), (7, 8),        # Index
    (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
    (9, 13), (13, 14), (14, 15), (15, 16), # Ring
    (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
    (0, 17)                                # Palm base
]

def draw_landmarks(frame: np.ndarray, landmarks: List[Dict[str, float]], color: tuple = (0, 255, 200)):
    """Draw 21 hand landmarks and connection lines on the frame."""
    h, w, _ = frame.shape
    coords = []
    for lm in landmarks:
        cx, cy = int(lm["x"] * w), int(lm["y"] * h)
        coords.append((cx, cy))
        cv2.circle(frame, (cx, cy), 4, color, -1)
        cv2.circle(frame, (cx, cy), 5, (255, 255, 255), 1)

    for start_idx, end_idx in HAND_CONNECTIONS:
        if start_idx < len(coords) and end_idx < len(coords):
            cv2.line(frame, coords[start_idx], coords[end_idx], (180, 220, 255), 2)

def draw_hud(
    frame: np.ndarray,
    gesture_name: Optional[str],
    confidence: float,
    fps: float,
    server_status: str,
    session_code: str,
    mode: str = "DEBUG"
):
    """Draw a clean, informative HUD overlay on the preview frame."""
    h, w, _ = frame.shape

    # Top banner background
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 85), (20, 24, 33), -1)
    # Bottom banner
    cv2.rectangle(overlay, (0, h - 35), (w, h), (20, 24, 33), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    # Title
    cv2.putText(frame, "EduGesture 3D - Teacher Agent", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    # Status indicators
    status_color = (0, 255, 120) if server_status == "CONNECTED" else (0, 165, 255) if "CONNECT" in server_status else (0, 60, 255)
    cv2.putText(frame, f"Server: {server_status}", (15, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 1)
    cv2.putText(frame, f"Session: {session_code}", (220, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 220, 255), 1)
    cv2.putText(frame, f"FPS: {int(fps)}", (w - 90, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

    # Active Gesture display
    gesture_text = gesture_name if gesture_name else "SEARCHING HAND..."
    gesture_color = (0, 255, 255) if gesture_name else (150, 150, 150)
    cv2.putText(frame, f"GESTURE: {gesture_text}", (15, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.55, gesture_color, 2)

    if mode == "DEBUG" and gesture_name:
        cv2.putText(frame, f"Conf: {confidence:.2f}", (320, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 255, 180), 1)

    # Bottom footer
    cv2.putText(frame, "Press 'q' or ESC to exit | 'r' to reset model", (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 180, 180), 1)
