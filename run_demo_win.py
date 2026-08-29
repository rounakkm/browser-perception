"""
Windows-compatible demo runner.
Starts the test webapp (port 8080) + runs the profile scenario
against an already-running gateway (port 8000).

Usage:
  Terminal 1: D:\Anaconda\envs\Adarsh\python.exe run_server.py
  Terminal 2: D:\Anaconda\envs\Adarsh\python.exe run_demo_win.py
  Terminal 3: cd dashboard && npm run dev
"""

import sys
import asyncio

# Must be first — before any asyncio use
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import time
import threading
import httpx
import uvicorn

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.demo.webapp.app import app as webapp
from backend.demo.scenarios.profile_scenario import execute_profile_scenario
from backend.config.logging import get_logger, setup_logging

WEBAPP_PORT = 8080
GATEWAY_PORT = 8000
logger = get_logger("demo_runner")


def _run_webapp_thread():
    """Run the test web app in a background thread (same process, different port)."""
    uvicorn.run(webapp, host="127.0.0.1", port=WEBAPP_PORT, log_level="warning")


async def wait_for_server(url: str, timeout: int = 30) -> bool:
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
    setup_logging()

    # Check gateway is running first
    logger.info("Checking gateway is running at port 8000...")
    gw_ready = await wait_for_server(f"http://127.0.0.1:{GATEWAY_PORT}/health", timeout=10)
    if not gw_ready:
        logger.error(
            "\n[ERROR] Gateway not running!\n"
            "Start it first with:\n"
            "  D:\\Anaconda\\envs\\Adarsh\\python.exe run_server.py\n"
        )
        return

    logger.info("[OK] Gateway running at http://127.0.0.1:8000")

    # Start test webapp in background thread
    logger.info("Starting test web app at port 8080...")
    t = threading.Thread(target=_run_webapp_thread, daemon=True)
    t.start()

    webapp_ready = await wait_for_server(f"http://127.0.0.1:{WEBAPP_PORT}/", timeout=15)
    if not webapp_ready:
        logger.error("[ERROR] Test web app did not start in time")
        return

    logger.info("[OK] Test web app running at http://127.0.0.1:8080")
    logger.info("=" * 60)
    logger.info(" STARTING PROFILE FORM FILLING DEMO")
    logger.info("=" * 60)
    logger.info("Watch:")
    logger.info("  - A Chromium browser window will open automatically")
    logger.info("  - The agent navigates to the login page, logs in")
    logger.info("  - Then fills the profile form with saved (sanitized) data")
    logger.info("  - Screenshots appear live on the dashboard at localhost:3000/live")
    logger.info("=" * 60)

    try:
        await execute_profile_scenario(
            f"http://127.0.0.1:{GATEWAY_PORT}",
            f"http://127.0.0.1:{WEBAPP_PORT}"
        )
        logger.info("\n[SUCCESS] Demo complete! Check the dashboard for captured screenshots.")
        logger.info("Keeping web app alive for 10s for inspection...")
        await asyncio.sleep(10)
    except Exception as e:
        import traceback
        logger.error(f"Demo error: {e}\n{traceback.format_exc()}")


if __name__ == "__main__":
    if sys.platform == 'win32':
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(main())
    else:
        asyncio.run(main())
