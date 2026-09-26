import math
from typing import List, Dict, Any

def distance_2d(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculate Euclidean distance between two 2D points (x, y)."""
    return math.hypot(p1["x"] - p2["x"], p1["y"] - p2["y"])

def distance_3d(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculate Euclidean distance between two 3D points (x, y, z)."""
    return math.sqrt(
        (p1["x"] - p2["x"]) ** 2 +
        (p1["y"] - p2["y"]) ** 2 +
        (p1.get("z", 0.0) - p2.get("z", 0.0)) ** 2
    )

def is_finger_extended(landmarks: List[Dict[str, float]], tip_idx: int, pip_idx: int, mcp_idx: int) -> bool:
    """
    Determine if a finger (index, middle, ring, pinky) is extended.
    In image coordinates (y increases downward), an extended finger has tip higher (smaller y)
    than PIP and MCP, or distance from wrist is significantly larger.
    """
    wrist = landmarks[0]
    tip = landmarks[tip_idx]
    pip = landmarks[pip_idx]
    mcp = landmarks[mcp_idx]

    dist_tip_wrist = distance_2d(tip, wrist)
    dist_pip_wrist = distance_2d(pip, wrist)
    dist_mcp_wrist = distance_2d(mcp, wrist)

    # Tip must be further from wrist than PIP and MCP
    return dist_tip_wrist > dist_pip_wrist and dist_pip_wrist > dist_mcp_wrist * 0.95

def is_thumb_extended(landmarks: List[Dict[str, float]], handedness: str = "Right") -> bool:
    """
    Determine if thumb is extended away from palm.
    Check distance between thumb tip and index MCP vs thumb IP and index MCP.
    """
    thumb_tip = landmarks[4]
    index_mcp = landmarks[5]
    thumb_ip = landmarks[3]

    return distance_2d(thumb_tip, index_mcp) > distance_2d(thumb_ip, index_mcp) * 1.25

def get_pinch_distance(landmarks: List[Dict[str, float]]) -> float:
    """Calculate distance between thumb tip (4) and index fingertip (8)."""
    return distance_2d(landmarks[4], landmarks[8])

def get_finger_states(landmarks: List[Dict[str, float]], handedness: str = "Right") -> Dict[str, bool]:
    """Return dictionary of boolean states for each finger: extended or not."""
    return {
        "thumb": is_thumb_extended(landmarks, handedness),
        "index": is_finger_extended(landmarks, 8, 6, 5),
        "middle": is_finger_extended(landmarks, 12, 10, 9),
        "ring": is_finger_extended(landmarks, 16, 14, 13),
        "pinky": is_finger_extended(landmarks, 20, 18, 17),
    }
