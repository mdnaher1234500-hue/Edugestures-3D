import cv2
import os
import logging
from typing import List, Dict, Optional, Tuple, Any
import numpy as np

logger = logging.getLogger(__name__)

class HandDetector:
    def __init__(self, max_num_hands: int = 2, min_detection_confidence: float = 0.7, min_tracking_confidence: float = 0.5):
        self.max_num_hands = max_num_hands
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.landmarker = None
        self.mp = None
        self._init_mediapipe()

    def _init_mediapipe(self):
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision

            self.mp = mp

            # Look for model asset path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            agent_dir = os.path.dirname(current_dir)
            root_agent_dir = os.path.dirname(agent_dir)
            possible_paths = [
                os.path.join(root_agent_dir, "hand_landmarker.task"),
                os.path.join(agent_dir, "hand_landmarker.task"),
                os.path.join(os.getcwd(), "apps", "gesture-agent", "hand_landmarker.task"),
                os.path.join(os.getcwd(), "hand_landmarker.task"),
            ]

            model_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    break

            if not model_path:
                logger.warning("hand_landmarker.task model file not found in paths")
                return

            base_options = mp_python.BaseOptions(model_asset_path=model_path)
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=self.max_num_hands,
                min_hand_detection_confidence=self.min_detection_confidence,
                min_hand_presence_confidence=self.min_tracking_confidence,
                min_tracking_confidence=self.min_tracking_confidence,
                running_mode=vision.RunningMode.IMAGE,
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            logger.info("MediaPipe HandLandmarker Tasks API initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MediaPipe HandLandmarker: {e}")
            self.landmarker = None

    def detect(self, bgr_frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Process a BGR frame through MediaPipe.
        Returns a list of detected hands, each containing:
        {
            "landmarks": [{"x": float, "y": float, "z": float}, ... 21 items],
            "handedness": "Right" | "Left",
            "score": float
        }
        """
        if self.landmarker is None or bgr_frame is None or self.mp is None:
            return []

        rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        mp_image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb_frame)

        result = self.landmarker.detect(mp_image)
        detected_hands = []

        if result.hand_landmarks:
            for idx, hand_landmarks in enumerate(result.hand_landmarks):
                handedness_label = "Right"
                score = 0.9
                if result.handedness and idx < len(result.handedness):
                    handedness_label = result.handedness[idx][0].category_name
                    score = result.handedness[idx][0].score

                landmarks_list = []
                for lm in hand_landmarks:
                    landmarks_list.append({
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z)
                    })

                detected_hands.append({
                    "landmarks": landmarks_list,
                    "handedness": handedness_label,
                    "score": float(score)
                })

        return detected_hands

    def close(self):
        if self.landmarker is not None:
            self.landmarker.close()
            self.landmarker = None
