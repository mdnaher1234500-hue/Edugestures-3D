import time
import numpy as np
from .vision.hand_detector import HandDetector
from .gestures.classifier import GestureClassifier
from .gestures.commands import GestureType

def run_gesture_test():
    print("=== EduGesture Hand Detection & Gesture Test ===")
    detector = HandDetector(max_num_hands=1)
    if detector.landmarker is None:
        print("[WARN] MediaPipe landmarker not initialized.")
    else:
        print("[OK] MediaPipe Hand Detector initialized.")

    classifier = GestureClassifier()
    print("[OK] Gesture Classifier initialized.")

    # Test with synthetic pointing hand
    lms = [{"x": 0.5, "y": 0.8} for _ in range(21)]
    for pip in [6, 10, 14, 18]:
        lms[pip] = {"x": 0.5, "y": 0.5}
    lms[8] = {"x": 0.5, "y": 0.2} # index extended

    gesture, conf = classifier.classify(lms)
    print(f"[OK] Synthetic Pointing Test Result: {gesture} (confidence: {conf:.2f})")
    assert gesture == GestureType.ROTATE, f"Expected ROTATE, got {gesture}"

    # Test with synthetic fist hand
    for tip in [4, 8, 12, 16, 20]:
        lms[tip] = {"x": 0.5, "y": 0.6}
    gesture, conf = classifier.classify(lms)
    print(f"[OK] Synthetic Fist Test Result: {gesture} (confidence: {conf:.2f})")
    assert gesture == GestureType.RESET, f"Expected RESET, got {gesture}"

    print("[SUCCESS] All gesture test assertions passed!")
    return True

if __name__ == "__main__":
    run_gesture_test()
