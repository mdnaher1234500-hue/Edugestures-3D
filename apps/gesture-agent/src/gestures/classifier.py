from typing import List, Dict, Optional, Tuple
from .commands import GestureType
from .gesture_config import GestureConfig
from ..vision.landmark_utils import get_finger_states, get_pinch_distance

class GestureClassifier:
    def __init__(self, config: Optional[GestureConfig] = None):
        self.config = config or GestureConfig()

    def classify(self, landmarks: List[Dict[str, float]], handedness: str = "Right") -> Tuple[Optional[GestureType], float]:
        """
        Classify hand landmarks into one of the 5 primary gestures using geometric relationships.
        Returns: (GestureType or None, confidence float 0.0-1.0)
        """
        if not landmarks or len(landmarks) < 21:
            return None, 0.0

        finger_states = get_finger_states(landmarks, handedness)
        pinch_dist = get_pinch_distance(landmarks)

        thumb = finger_states["thumb"]
        index = finger_states["index"]
        middle = finger_states["middle"]
        ring = finger_states["ring"]
        pinky = finger_states["pinky"]

        # 1. RESET: Closed fist (all fingers curled)
        if not index and not middle and not ring and not pinky:
            return GestureType.RESET, 0.92

        # 2. ZOOM: Thumb and Index in pinch proximity
        if pinch_dist < self.config.pinch_threshold:
            confidence = max(0.6, 1.0 - (pinch_dist / self.config.pinch_threshold) * 0.4)
            return GestureType.ZOOM, confidence

        # 3. ROTATE: Pointing finger (Index extended, others curled)
        if index and not middle and not ring and not pinky:
            return GestureType.ROTATE, 0.95

        # 4. HIGHLIGHT: Two fingers (Index and Middle extended, ring and pinky curled)
        if index and middle and not ring and not pinky:
            return GestureType.HIGHLIGHT, 0.90

        # 5. SELECT: Open hand (all fingers extended)
        if index and middle and ring and pinky:
            return GestureType.SELECT, 0.88

        return None, 0.0
