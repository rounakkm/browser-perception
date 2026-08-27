import asyncio
import httpx
import logging
from backend.demo.agent_view.privacy_monitor import PrivacyMonitor
from backend.config.logging import get_logger

logger = get_logger("profile_scenario")

async def execute_profile_scenario(api_url: str, base_web_url: str):
    async with httpx.AsyncClient(timeout=30.0) as client:

        logger.info(f"\n[Agent Task]: 'Complete my account profile using my saved information and save the changes.'")
        login_url = f"{base_web_url}/login"
        logger.info(f"\n[1] Agent Action: Navigate to {login_url}")

        await client.post(f"{api_url}/agent/action", json={"action": "navigate", "url": login_url})
        await asyncio.sleep(1.0)

        ctx_resp = await client.post(f"{api_url}/agent/context?task=Login to user account")
        context = ctx_resp.json()
        PrivacyMonitor.render_perception_view(context['page'])

        email_elem = next((e for e in context['page']['elements'] if e['element_id'] == 'login_email'), None)
        pass_elem = next((e for e in context['page']['elements'] if e['element_id'] == 'login_password'), None)

        if email_elem and email_elem.get('value'):
            logger.info(f"[Agent Action]: Fill login email using token '{email_elem['value']}'")
            await client.post(f"{api_url}/agent/action", json={"action": "fill", "element_id": "login_email", "value_token": email_elem['value']})

        if pass_elem and pass_elem.get('value'):
            logger.info(f"[Agent Action]: Fill login password using token '{pass_elem['value']}'")
            await client.post(f"{api_url}/agent/action", json={"action": "fill", "element_id": "login_password", "value_token": pass_elem['value']})

        logger.info("[Agent Action]: Click Sign In button")
        await client.post(f"{api_url}/agent/action", json={"action": "click", "element_id": "login_btn"})
        await asyncio.sleep(2.0)  # Wait for navigation

        # Navigate explicitly to profile after login
        profile_url = f"{base_web_url}/profile"
        logger.info(f"\n[2] Agent Action: Navigate to Profile Page ({profile_url})")
        await client.post(f"{api_url}/agent/action", json={"action": "navigate", "url": profile_url})
        await asyncio.sleep(1.0)

        logger.info("\n[2] Requesting Sanitized Context for Profile Page...")
        ctx_resp = await client.post(f"{api_url}/agent/context?task=Update account profile and save changes")
        context = ctx_resp.json()
        PrivacyMonitor.render_perception_view(context['page'])

        inputs = [e for e in context['page']['elements'] if e.get('type') == 'input']
        actions_count = 0
        sensitive_count = 0

        for input_elem in inputs:
            elem_id = input_elem['element_id']
            label = input_elem.get('label') or elem_id
            token = input_elem.get('value')

            if input_elem.get('sensitive'):
                sensitive_count += 1

            logger.info(f"[Agent Action]: Fill field '{label}' ({elem_id}) using token: '{token}'")
            fill_resp = await client.post(f"{api_url}/agent/action", json={
                "action": "fill",
                "element_id": elem_id,
                "value_token": token
            })
            if fill_resp.json().get("success"):
                actions_count += 1
            await asyncio.sleep(0.3)

        # Find and click save button (try multiple possible IDs)
        save_btn = next(
            (e for e in context['page']['elements']
             if e.get('element_id') in ('save_btn', 'save-btn', 'submit_btn') or
                ('save' in (e.get('label') or '').lower() and e.get('type') == 'button')),
            None
        )
        if save_btn:
            logger.info(f"\n[Agent Action]: Click Save Changes button ({save_btn['element_id']})")
            click_resp = await client.post(f"{api_url}/agent/action", json={
                "action": "click",
                "element_id": save_btn['element_id']
            })
            if click_resp.json().get("success"):
                actions_count += 1
        else:
            logger.warning("[Warning]: Save button not found in page elements")

        logger.info("\n[3] Navigating to Banking Dashboard to demonstrate Visual OCR Perception...")
        banking_url = f"{base_web_url}/banking"
        await client.post(f"{api_url}/agent/action", json={"action": "navigate", "url": banking_url})
        await asyncio.sleep(1.0)

        b_ctx = await client.post(f"{api_url}/agent/context?task=Inspect visual account card")
        PrivacyMonitor.render_perception_view(b_ctx.json()['page'])

        PrivacyMonitor.render_privacy_proof_banner(action_count=actions_count, sensitive_fields_count=sensitive_count)
