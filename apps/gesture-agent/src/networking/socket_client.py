import logging
import socketio
from typing import Optional, Callable
from ..gestures.commands import GestureCommand

logger = logging.getLogger(__name__)

class ConnectionStatus:
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    RECONNECTING = "RECONNECTING"
    ERROR = "ERROR"
    STOPPED = "STOPPED"

class SocketClient:
    def __init__(self, server_url: str, on_state_change: Optional[Callable[[str], None]] = None):
        self.server_url = server_url
        self.status = ConnectionStatus.DISCONNECTED
        self.on_state_change = on_state_change
        self.token: Optional[str] = None
        self.session_code: Optional[str] = None

        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=0, # infinite attempts
            reconnection_delay=1,
            reconnection_delay_max=5,
            logger=False,
            engineio_logger=False,
        )

        self._register_handlers()

    def _set_status(self, new_status: str):
        self.status = new_status
        logger.info(f"Socket connection status: {new_status}")
        if self.on_state_change:
            self.on_state_change(new_status)

    def _register_handlers(self):
        @self.sio.event
        def connect():
            self._set_status(ConnectionStatus.CONNECTED)
            logger.info("Connected to EduGesture Socket.IO server")
            # Join session once connected
            if self.session_code and self.token:
                self.join_session(self.session_code, self.token)

        @self.sio.event
        def disconnect():
            self._set_status(ConnectionStatus.DISCONNECTED)
            logger.warning("Disconnected from EduGesture server")

        @self.sio.event
        def connect_error(data):
            self._set_status(ConnectionStatus.ERROR)
            logger.error(f"Connection error: {data}")

        @self.sio.on("session:state")
        def on_session_state(data):
            logger.debug(f"Received session transform state: {data}")

        @self.sio.on("session:error")
        def on_session_error(message):
            logger.error(f"Server session error: {message}")

    def connect(self, token: str, session_code: str):
        """Connect to the Socket.IO server and authenticate."""
        self.token = token
        self.session_code = session_code
        self._set_status(ConnectionStatus.CONNECTING)

        try:
            self.sio.connect(
                self.server_url,
                auth={"token": token},
                transports=["websocket", "polling"],
                wait_timeout=10,
            )
        except Exception as e:
            logger.error(f"Initial connection failed: {e}")
            self._set_status(ConnectionStatus.ERROR)

    def join_session(self, session_code: str, token: str):
        """Send session:join event to bind socket to live session room."""
        if not self.sio.connected:
            return
        logger.info(f"Joining classroom room with code: {session_code}")
        self.sio.emit("session:join", {
            "sessionCode": session_code,
            "token": token
        })
        self.sio.emit("gesture:agent_status", {
            "sessionCode": session_code,
            "status": "Active (Python Agent)"
        })

    def send_gesture(self, command: GestureCommand):
        """Emit gesture:command event to the server."""
        if not self.sio.connected or not self.session_code:
            return

        payload = {
            "sessionCode": self.session_code,
            "command": command.to_dict()
        }
        self.sio.emit("gesture:command", payload)
        logger.debug(f"Emitted gesture {command.type.value} command: {command.payload}")

    def disconnect(self):
        self._set_status(ConnectionStatus.STOPPED)
        if self.sio.connected:
            self.sio.disconnect()
