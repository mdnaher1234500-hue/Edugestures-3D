import time
import cv2
from .camera.camera import Camera
from .camera.camera_config import CameraConfig

def run_camera_test():
    print("=== EduGesture Camera Diagnostics ===")
    config = CameraConfig(camera_index=0, width=640, height=480, fps=30)
    camera = Camera(config)

    print(f"Testing camera index {config.camera_index}...")
    if not camera.start():
        print("[WARN] Camera index 0 could not be opened (no webcam or permissions).")
        print("[INFO] If running in headless environment, connect physical webcam before running main.py.")
        return False

    print("[OK] Camera opened successfully.")
    print("Capturing frames to verify FPS and resolution...")

    frames_read = 0
    start_time = time.time()

    for _ in range(15):
        success, frame = camera.read_frame()
        if success and frame is not None:
            frames_read += 1
            if frames_read == 1:
                h, w, c = frame.shape
                print(f"[OK] Resolution confirmed: {w}x{h}, {c} channels")

    elapsed = time.time() - start_time
    measured_fps = frames_read / max(0.001, elapsed)
    print(f"[OK] Read {frames_read}/15 frames in {elapsed:.2f}s ({measured_fps:.1f} FPS)")

    camera.stop()
    print("[SUCCESS] Camera test completed cleanly.")
    return True

if __name__ == "__main__":
    run_camera_test()
