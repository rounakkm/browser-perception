import asyncio
import os
import httpx
from backend.agent_gateway.mock_agent import SavedProfileMockAgent
from backend.demo.agent_view.privacy_monitor import PrivacyMonitor

API_URL = "http://127.0.0.1:8000"

async def main():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(f"{API_URL}/agent/context?task=Update my profile using my saved information")
                response.raise_for_status()
            except httpx.ConnectError:
                print(f"\n[ERROR]: Could not connect to FastAPI Gateway at {API_URL}.")
                print("\nPlease ensure the gateway backend is running first. Command to start:")
                print("  PYTHONPATH=. .venv/bin/python -m uvicorn backend.api.gateway:app --host 127.0.0.1 --port 8000\n")
                return

            context = response.json()
            session_id = context.get("session_id")
            page_revision = context.get("page_revision")
            if not session_id or page_revision is None:
                print("\n[NOTICE]: No active Chrome extension session found.")
                print("\nPlease complete these setup steps:")
                print("  1. Start backend gateway on port 8000")
                print("  2. Start test web app: PYTHONPATH=. .venv/bin/python -m uvicorn backend.demo.webapp.app:app --host 127.0.0.1 --port 8080")
                print("  3. Open Chrome to http://127.0.0.1:8080/profile with the extension enabled.")
                print("  4. Re-run this script.\n")
                return

            PrivacyMonitor.render_perception_view(context["page"])

            print("[Agent Mode]: Initializing BM25-powered SavedProfileMockAgent (On-Device)...")
            agent = SavedProfileMockAgent()

            from backend.models.domain import SanitizedPageState
            state = SanitizedPageState.model_validate(context["page"])
            while action := agent.next_action(state):
                action.session_id = session_id
                action.page_revision = page_revision
                print(f"Agent Action -> {action.action.upper()}(element_id='{action.element_id}', value_token/value='{action.value_token or action.value or ''}')")
                result = await client.post(f"{API_URL}/agent/action", json=action.model_dump(exclude_none=True))
                result.raise_for_status()
                await asyncio.sleep(0.6)
                refreshed = await client.post(
                    f"{API_URL}/agent/context?task=Update my profile using my saved information&session_id={session_id}"
                )
                refreshed.raise_for_status()
                context = refreshed.json()
                page_revision = context["page_revision"]
                state = SanitizedPageState.model_validate(context["page"])
            print("\n[SUCCESS]: Actions queued for Chrome extension. Watch the real browser tab.")
    except Exception as e:
        print(f"\n[ERROR]: Unexpected error running Chrome agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())
