import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.vision.landmark_utils import distance_2d, distance_3d, get_pinch_distance, is_finger_extended

def test_distance_2d():
    p1 = {"x": 0.0, "y": 0.0}
    p2 = {"x": 3.0, "y": 4.0}
    assert distance_2d(p1, p2) == 5.0

def test_distance_3d():
    p1 = {"x": 0.0, "y": 0.0, "z": 0.0}
    p2 = {"x": 1.0, "y": 2.0, "z": 2.0}
    assert distance_3d(p1, p2) == 3.0

def test_pinch_distance():
    landmarks = [{"x": 0.0, "y": 0.0}] * 21
    landmarks[4] = {"x": 0.5, "y": 0.5} # Thumb tip
    landmarks[8] = {"x": 0.53, "y": 0.54} # Index tip
    dist = get_pinch_distance(landmarks)
    assert dist == pytest.approx(0.05, 0.01)
