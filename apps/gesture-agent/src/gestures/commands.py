import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any

class GestureType(str, Enum):
    ROTATE = "ROTATE"
    ZOOM = "ZOOM"
    SELECT = "SELECT"
    HIGHLIGHT = "HIGHLIGHT"
    RESET = "RESET"

@dataclass
class GestureCommand:
    type: GestureType
    payload: Dict[str, Any] = field(default_factory=dict)
    session_id: Optional[str] = None
    timestamp: float = field(default_factory=lambda: time.time() * 1000)

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "type": self.type.value,
            "payload": self.payload,
            "timestamp": self.timestamp,
        }
        if self.session_id:
            data["sessionId"] = self.session_id
        return data
