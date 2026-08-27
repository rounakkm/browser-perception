"""Run the mock agent against a page already open in real Chrome with the extension."""
import asyncio
import httpx
from backend.agent_gateway.mock_agent import SavedProfileMockAgent
from backend.demo.agent_view.privacy_monitor import PrivacyMonitor

API_URL = "http://127.0.0.1:8000"


async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{API_URL}/agent/context?task=Update my profile using my saved information")
        response.raise_for_status()
        context = response.json()
        session_id = context.get("session_id")
        page_revision = context.get("page_revision")
        if not session_id or page_revision is None:
            raise RuntimeError("No extension page is active. Activate a supported page from the extension first.")
        PrivacyMonitor.render_perception_view(context["page"])
        agent = SavedProfileMockAgent()
        # Rehydrate through Pydantic at the boundary; no raw browser data enters here.
        from backend.models.domain import SanitizedPageState
        state = SanitizedPageState.model_validate(context["page"])
        while action := agent.next_action(state):
            action.session_id = session_id
            action.page_revision = page_revision
            print(f"Agent: {action.action.upper()}({action.element_id}, {action.value_token or action.value or ''})")
            result = await client.post(f"{API_URL}/agent/action", json=action.model_dump(exclude_none=True))
            result.raise_for_status()
            await asyncio.sleep(0.6)
            # The extension reports the DOM after every action. Refresh the
            # sanitized context so the next action is bound to that revision.
            refreshed = await client.post(
                f"{API_URL}/agent/context?task=Update my profile using my saved information&session_id={session_id}"
            )
            refreshed.raise_for_status()
            context = refreshed.json()
            page_revision = context["page_revision"]
            state = SanitizedPageState.model_validate(context["page"])
        print("Actions queued for the local Chrome extension. Watch the browser window.")


if __name__ == "__main__":
    asyncio.run(main())
