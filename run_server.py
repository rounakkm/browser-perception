"""
Entry point for Windows. Sets the ProactorEventLoop *before* uvicorn touches
asyncio, then runs uvicorn directly on that loop (no subprocess reloader issue).
"""
import sys
import asyncio

# Must happen before ANY asyncio import/use
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    config = uvicorn.Config(
        "backend.api.gateway:app",
        host="127.0.0.1",
        port=8000,
        reload=False,          # reload=False avoids the subprocess that resets the loop
        log_level="info",
    )
    server = uvicorn.Server(config)

    if sys.platform == 'win32':
        # Run directly on a ProactorEventLoop – supports subprocesses (Playwright)
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(server.serve())
    else:
        asyncio.run(server.serve())
