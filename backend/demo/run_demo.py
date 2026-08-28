import os
import sys
import asyncio
import time
import uvicorn
import multiprocessing


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

async def main():
    print("=================================================================")
    print(" STARTING REAL-BROWSER PRIVACY PERCEPTION DEMONSTRATION")
    print("=================================================================")
    webapp_proc = multiprocessing.Process(target=run_webapp, daemon=True)
    webapp_proc.start()
    gateway_proc = multiprocessing.Process(target=run_gateway, daemon=True)
    gateway_proc.start()

    await asyncio.sleep(2.5)
    try:
        api_url = f"http://127.0.0.1:{GATEWAY_PORT}"
        base_web_url = f"http://127.0.0.1:{WEBAPP_PORT}"

        await execute_profile_scenario(api_url, base_web_url)
        print("Pausing 5 seconds for visual inspection of the Chromium browser window...")
        await asyncio.sleep(5.0)
    finally:
        print("Cleaning up demo processes...")
        webapp_proc.terminate()
        gateway_proc.terminate()
        print("Demo completed.")

if __name__ == "__main__":
    asyncio.run(main())
