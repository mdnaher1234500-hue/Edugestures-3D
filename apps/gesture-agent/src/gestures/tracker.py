import time
from typing import List, Dict, Optional, Tuple
from .commands import GestureType, GestureCommand
from .gesture_config import GestureConfig
from ..vision.landmark_utils import get_pinch_distance

class GestureTracker:
    def __init__(self, config: Optional[GestureConfig] = None):
        self.config = config or GestureConfig()

        # State tracking
        self.last_gesture: Optional[GestureType] = None
        self.stable_gesture: Optional[GestureType] = None
        self.gesture_frame_count: int = 0

        # Movement tracking
        self.prev_index_pos: Optional[Tuple[float, float]] = None
        self.prev_pinch_dist: Optional[float] = None

        # Cooldown & trigger prevention
        self.last_command_time: float = 0.0
        self.reset_triggered: bool = False

    def update(
        self,
        raw_gesture: Optional[GestureType],
        confidence: float,
        landmarks: Optional[List[Dict[str, float]]] = None,
        session_id: Optional[str] = None
    ) -> Optional[GestureCommand]:
        """
        Process a new classified gesture frame, apply temporal stability,
        calculate movement deltas with dead-zone and smoothing, and produce commands.
        """
        now = time.time()

        # Confidence check
        if confidence < self.config.confidence_threshold:
            raw_gesture = None

        # 1. Temporal Stability Filter
        if raw_gesture == self.last_gesture and raw_gesture is not None:
            self.gesture_frame_count += 1
        else:
            self.last_gesture = raw_gesture
            self.gesture_frame_count = 1

        # Check if gesture has been held for enough frames
        if self.gesture_frame_count >= self.config.gesture_stability_frames:
            if self.stable_gesture != raw_gesture:
                self.stable_gesture = raw_gesture
                # Reset tracking anchors on gesture transition
                self.prev_index_pos = None
                self.prev_pinch_dist = None
                self.reset_triggered = False
        else:
            if raw_gesture is None:
                self.stable_gesture = None
                self.prev_index_pos = None
                self.prev_pinch_dist = None
                self.reset_triggered = False
            return None

        if self.stable_gesture is None or landmarks is None or len(landmarks) < 21:
            return None

        # Cooldown check
        if (now - self.last_command_time) < self.config.command_cooldown:
            return None

        command: Optional[GestureCommand] = None

        # 2. Gesture-specific Movement Tracking
        if self.stable_gesture == GestureType.ROTATE:
            index_tip = landmarks[8]
            curr_pos = (index_tip["x"], index_tip["y"])

            if self.prev_index_pos is not None:
                dx = (curr_pos[0] - self.prev_index_pos[0]) * self.config.rotate_sensitivity
                dy = (curr_pos[1] - self.prev_index_pos[1]) * self.config.rotate_sensitivity

                # Apply dead zone
                if abs(dx) < self.config.dead_zone:
                    dx = 0.0
                if abs(dy) < self.config.dead_zone:
                    dy = 0.0

                if dx != 0.0 or dy != 0.0:
                    command = GestureCommand(
                        type=GestureType.ROTATE,
                        payload={"deltaX": round(float(dx), 4), "deltaY": round(float(dy), 4)},
                        session_id=session_id
                    )

            self.prev_index_pos = curr_pos

        elif self.stable_gesture == GestureType.ZOOM:
            curr_pinch = get_pinch_distance(landmarks)

            if self.prev_pinch_dist is not None:
                delta = (curr_pinch - self.prev_pinch_dist) * self.config.zoom_sensitivity
                if abs(delta) > self.config.dead_zone:
                    command = GestureCommand(
                        type=GestureType.ZOOM,
                        payload={"zoomDelta": round(float(delta), 4)},
                        session_id=session_id
                    )

            self.prev_pinch_dist = curr_pinch

        elif self.stable_gesture == GestureType.HIGHLIGHT:
            index_tip = landmarks[8]
            command = GestureCommand(
                type=GestureType.HIGHLIGHT,
                payload={"anchorX": round(index_tip["x"], 3), "anchorY": round(index_tip["y"], 3)},
                session_id=session_id
            )

        elif self.stable_gesture == GestureType.SELECT:
            command = GestureCommand(
                type=GestureType.SELECT,
                payload={},
                session_id=session_id
            )

        elif self.stable_gesture == GestureType.RESET:
            # Trigger once per fist gesture
            if not self.reset_triggered:
                self.reset_triggered = True
                command = GestureCommand(
                    type=GestureType.RESET,
                    payload={},
                    session_id=session_id
                )

        if command:
            self.last_command_time = now

        return command
