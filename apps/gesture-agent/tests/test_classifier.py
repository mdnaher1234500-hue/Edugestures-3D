import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.gestures.classifier import GestureClassifier
from src.gestures.commands import GestureType

def make_hand(pointing=False, open_hand=False, fist=False, pinch=False):
    # Wrist at (0.5, 0.8)
    lms = [{"x": 0.5, "y": 0.8} for _ in range(21)]

    # PIPs around y=0.5
    for pip in [6, 10, 14, 18]:
        lms[pip] = {"x": 0.5, "y": 0.5}

    if pointing:
        # Index tip high (y=0.2), others curled near palm (y=0.6)
        lms[8] = {"x": 0.5, "y": 0.2}
        lms[12] = {"x": 0.5, "y": 0.6}
        lms[16] = {"x": 0.5, "y": 0.6}
        lms[20] = {"x": 0.5, "y": 0.6}
        lms[4] = {"x": 0.45, "y": 0.6}
    elif open_hand:
        # All tips high
        lms[4] = {"x": 0.2, "y": 0.4}
        lms[8] = {"x": 0.4, "y": 0.2}
        lms[12] = {"x": 0.5, "y": 0.2}
        lms[16] = {"x": 0.6, "y": 0.2}
        lms[20] = {"x": 0.7, "y": 0.2}
    elif fist:
        # All tips low/curled
        for tip in [4, 8, 12, 16, 20]:
            lms[tip] = {"x": 0.5, "y": 0.6}
    elif pinch:
        # Thumb tip (4) and index tip (8) very close
        lms[4] = {"x": 0.5, "y": 0.4}
        lms[8] = {"x": 0.52, "y": 0.41}

    return lms

def test_classify_rotate():
    classifier = GestureClassifier()
    lms = make_hand(pointing=True)
    gesture, conf = classifier.classify(lms)
    assert gesture == GestureType.ROTATE
    assert conf > 0.8

def test_classify_pinch():
    classifier = GestureClassifier()
    lms = make_hand(pinch=True)
    gesture, conf = classifier.classify(lms)
    assert gesture == GestureType.ZOOM
    assert conf > 0.7

def test_classify_reset():
    classifier = GestureClassifier()
    lms = make_hand(fist=True)
    gesture, conf = classifier.classify(lms)
    assert gesture == GestureType.RESET
