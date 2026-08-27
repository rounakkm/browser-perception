import os
import sys
import asyncio
import time
import uvicorn
import multiprocessing
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.demo.webapp.app import app as webapp
from backend.api.gateway import app as gateway_app
from backend.demo.scenarios.profile_scenario import execute_profile_scenario
from backend.config.settings import settings

WEBAPP_PORT = 8080
GATEWAY_PORT = 8000

def run_webapp():
    uvicorn.run(webapp, host="127.0.0.1", port=WEBAPP_PORT, log_level="warning")

def run_gateway():
    settings.BROWSER_HEADLESS = False
    uvicorn.run(gateway_app, host="127.0.0.1", port=GATEWAY_PORT, log_level="warning")

async def wait_for_server(url: str, timeout: int = 30):
    """Poll a server until it responds or timeout."""
    deadline = time.time() + timeout
    async with httpx.AsyncClient(timeout=2.0) as client:
        while time.time() < deadline:
            try:
                resp = await client.get(url)
                if resp.status_code < 500:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.5)
    return False

async def main():
    print("=================================================================")
    print(" STARTING REAL-BROWSER PRIVACY PERCEPTION DEMONSTRATION")
    print("=================================================================")

    # Start webapp server
    webapp_proc = multiprocessing.Process(target=run_webapp, daemon=True)
    webapp_proc.start()

    # Start gateway server
    gateway_proc = multiprocessing.Process(target=run_gateway, daemon=True)
    gateway_proc.start()

    print("Waiting for servers to start...")

    # Wait for both servers to be ready
    webapp_ready = await wait_for_server(f"http://127.0.0.1:{WEBAPP_PORT}/", timeout=30)
    gateway_ready = await wait_for_server(f"http://127.0.0.1:{GATEWAY_PORT}/health", timeout=40)

    if not webapp_ready:
        print("ERROR: Web app server did not start in time")
        webapp_proc.terminate()
        gateway_proc.terminate()
        return

    if not gateway_ready:
        print("ERROR: Gateway server did not start in time")
        webapp_proc.terminate()
        gateway_proc.terminate()
        return

    print(f"[OK] Web App running at http://127.0.0.1:{WEBAPP_PORT}")
    print(f"[OK] Gateway API running at http://127.0.0.1:{GATEWAY_PORT}")

    try:
        api_url = f"http://127.0.0.1:{GATEWAY_PORT}"
        base_web_url = f"http://127.0.0.1:{WEBAPP_PORT}"

        await execute_profile_scenario(api_url, base_web_url)

        print("Pausing 5 seconds for visual inspection of the Chromium browser window...")
        await asyncio.sleep(5.0)

    except Exception as e:
        print(f"Demo error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("Cleaning up demo processes...")
        webapp_proc.terminate()
        gateway_proc.terminate()
        print("Demo completed.")

if __name__ == "__main__":
    asyncio.run(main())
