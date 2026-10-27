import os
import sys
import time
import socket
import subprocess
import webbrowser
from pathlib import Path

APP_URL = "http://localhost:3000/login"
BACKEND_PORT = 8000
FRONTEND_PORT = 3000

def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def get_base_dir() -> Path:
    # Handle pyinstaller bundled exe path vs script path
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent

def launch_services():
    base_dir = get_base_dir()
    backend_dir = base_dir / "backend"
    frontend_dir = base_dir / "frontend"

    # Start backend if not running
    if not is_port_open(BACKEND_PORT):
        print(f"Starting Madani backend on port {BACKEND_PORT}...")
        backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"]
        subprocess.Popen(
            backend_cmd,
            cwd=str(backend_dir),
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )

    # Start frontend if not running
    if not is_port_open(FRONTEND_PORT):
        print(f"Starting Madani frontend on port {FRONTEND_PORT}...")
        subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd=str(frontend_dir),
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )

    # Wait for frontend to become responsive
    max_wait = 20
    for _ in range(max_wait):
        if is_port_open(FRONTEND_PORT):
            break
        time.sleep(1)

def open_desktop_window():
    # Attempt to open in Windows Native Application mode (borderless standalone window)
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
    ]
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]

    for p in edge_paths + chrome_paths:
        if os.path.exists(p):
            try:
                subprocess.Popen([p, f"--app={APP_URL}", "--window-size=1280,800"])
                return
            except Exception:
                pass

    # Fallback to default browser
    webbrowser.open(APP_URL)

def main():
    print("Launching Madani Enterprises ID Platform Desktop Client...")
    launch_services()
    open_desktop_window()
    print("Application window opened successfully.")

if __name__ == "__main__":
    main()
