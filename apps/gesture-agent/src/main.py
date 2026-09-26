import logging
import sys
import os
import signal
import argparse
import requests

# Add parent directory to path so imports work cleanly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings
from src.camera.camera import Camera
from src.camera.camera_config import CameraConfig
from src.vision.hand_detector import HandDetector
from src.gestures.classifier import GestureClassifier
from src.gestures.tracker import GestureTracker
from src.gestures.commands import GestureType, GestureCommand
from src.gestures.gesture_config import GestureConfig
from src.networking.authentication import AgentAuthenticator
from src.networking.socket_client import SocketClient, ConnectionStatus
from src.ui.preview import PreviewWindow

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("EduGestureAgent")

def discover_active_session(api_url: str, token: str) -> str | None:
    """Fetch the teacher's active live classroom session from the API."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{api_url}/sessions/my", headers=headers, timeout=5)
        if resp.status_code == 200:
            sessions = resp.json()
            if isinstance(sessions, list) and len(sessions) > 0:
                # Find first LIVE session, or newest session
                live_sessions = [s for s in sessions if s.get("status") == "LIVE"]
                target = live_sessions[0] if live_sessions else sessions[0]
                code = target.get("code")
                if code:
                    logger.info(f"Auto-discovered active classroom session: {code} ({target.get('title', 'Untitled')})")
                    return code
    except Exception as e:
        logger.debug(f"Could not auto-discover session: {e}")
    return None

def main():
    parser = argparse.ArgumentParser(description="EduGesture 3D Python MediaPipe Gesture Agent")
    parser.add_argument("--session", "-s", type=str, default=None, help="Classroom session code (e.g. KNTM3J)")
    parser.add_argument("positional_session", nargs="?", type=str, default=None, help="Classroom session code")
    args = parser.parse_args()

    session_code = args.session or args.positional_session

    logger.info("=== Starting EduGesture 3D Gesture Agent ===")

    # 1. Authenticate Teacher
    authenticator = AgentAuthenticator(settings.api_url)
    auth_data = authenticator.authenticate(settings.teacher_email, settings.teacher_password)

    token = auth_data.get("accessToken") if auth_data else "demo-token"
    if not auth_data:
        logger.warning("Could not authenticate with API. Running in offline/demo mode.")

    # Auto-discover active session if not explicitly provided
    if not session_code and token and token != "demo-token":
        session_code = discover_active_session(settings.api_url, token)

    if not session_code:
        session_code = settings.session_code

    session_code = session_code.strip().upper()
    logger.info(f"Targeting classroom session: [ {session_code} ]")

    # 2. Initialize Socket.IO connection
    socket_client = SocketClient(settings.server_url)
    if token:
        socket_client.connect(token, session_code)

    # 3. Initialize Camera (with fallback indices)
    camera = None
    for cam_idx in [settings.camera_index, 1, 2]:
        cam_config = CameraConfig(
            camera_index=cam_idx,
            width=settings.frame_width,
            height=settings.frame_height,
            fps=settings.fps,
            mirror=settings.mirror_mode,
        )
        cam = Camera(cam_config)
        if cam.start():
            camera = cam
            logger.info(f"Successfully bound to camera index {cam_idx}")
            break

    if camera is None:
        logger.error("Could not open any webcam. Please check that a camera is connected and not exclusively locked.")
        sys.exit(1)

    # 4. Initialize Vision and Gesture Engines
    hand_detector = HandDetector(max_num_hands=1)
    gesture_config = GestureConfig(
        confidence_threshold=settings.confidence_threshold,
        pinch_threshold=settings.pinch_threshold,
        dead_zone=settings.dead_zone,
        rotate_sensitivity=settings.rotate_sensitivity,
        zoom_sensitivity=settings.zoom_sensitivity,
        gesture_stability_frames=settings.stability_frames,
        command_cooldown=settings.command_cooldown,
    )
    classifier = GestureClassifier(gesture_config)
    tracker = GestureTracker(gesture_config)
    preview = PreviewWindow()

    # Graceful shutdown handler
    running = True
    def signal_handler(sig, frame):
        nonlocal running
        logger.info("Termination signal received. Exiting...")
        running = False

    signal.signal(signal.SIGINT, signal_handler)

    logger.info(f"Gesture Agent Loop running for session {session_code}. Show your hand to the camera!")

    try:
        while running:
            success, frame = camera.read_frame()
            if not success or frame is None:
                continue

            # Detect hand
            hands = hand_detector.detect(frame)
            active_landmarks = None
            active_gesture_name = None
            active_confidence = 0.0

            if hands:
                hand = hands[0]
                active_landmarks = hand["landmarks"]
                handedness = hand["handedness"]

                # Classify gesture
                gesture_type, confidence = classifier.classify(active_landmarks, handedness)
                active_confidence = confidence

                if gesture_type:
                    active_gesture_name = gesture_type.value

                # Track movement & emit command
                command = tracker.update(
                    raw_gesture=gesture_type,
                    confidence=confidence,
                    landmarks=active_landmarks,
                    session_id=session_code
                )

                if command:
                    socket_client.send_gesture(command)
            else:
                tracker.update(None, 0.0, None, session_id=session_code)

            # Preview & Keyboard interactions
            action = preview.show(
                frame=frame,
                landmarks=active_landmarks,
                gesture_name=active_gesture_name,
                confidence=active_confidence,
                server_status=socket_client.status,
                session_code=session_code,
                mode=settings.mode
            )

            if action == 'quit':
                break
            elif action == 'reset':
                reset_cmd = GestureCommand(type=GestureType.RESET, payload={}, session_id=session_code)
                socket_client.send_gesture(reset_cmd)
                logger.info("Manual reset command dispatched")

    finally:
        logger.info("Cleaning up resources...")
        camera.stop()
        hand_detector.close()
        socket_client.disconnect()
        preview.close()
        logger.info("EduGesture Agent shut down cleanly.")

if __name__ == "__main__":
    main()
