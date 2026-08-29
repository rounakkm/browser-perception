import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    config = uvicorn.Config(
        "backend.api.gateway:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
    server = uvicorn.Server(config)

    if sys.platform == 'win32':

        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(server.serve())
    else:
        asyncio.run(server.serve())
