import asyncio
import json
import os
import httpx

API_URL = "http://127.0.0.1:8000"

async def run_demo():
    print("--- Starting Agent Demo ---")
    
    async with httpx.AsyncClient() as client:
       
        test_page_path = f"file://{os.path.abspath('backend/demo/test_pages/banking.html')}"
        print(f"\n[Agent] Navigating to: {test_page_path}")
        
        resp = await client.post(f"{API_URL}/agent/action", json={
            "action": "navigate",
            "url": test_page_path
        })
        print(f"[Middleware Response]: Navigate success={resp.json().get('success')}")
        
       
        print("\n[Agent] Requesting sanitized context...")
        resp = await client.post(f"{API_URL}/agent/context?task=Fill the banking form with my info")
        context = resp.json()
        
        page_state = context['page']
        
        print("\n--- Sanitized State Received by Agent ---")
        for elem in page_state['elements']:
            if elem['is_interactive']:
                sensitive_flag = "🔒 SENSITIVE" if elem.get('sensitive') else "📄 NORMAL"
                print(f"ID: {elem['element_id']} | Type: {elem['type']} | Label: {elem['label']} | [{sensitive_flag}] | Value/Text: {elem.get('value') or elem.get('text')}")
        print("-----------------------------------------")
        
      
        inputs = [e for e in page_state['elements'] if e.get('type') == 'input']
        
        for input_elem in inputs:
            elem_id = input_elem['element_id']
            label = input_elem.get('label') or elem_id
            is_sensitive = input_elem.get('sensitive')
            
            if is_sensitive:
                token = input_elem.get('value')
                print(f"\n[Agent] Field '{label}' is 🔒 SENSITIVE. Requesting fill using token: {token}")
                action = {
                    "action": "fill",
                    "element_id": elem_id,
                    "value_token": token
                }
            else:
                val = "John Doe" if "name" in label.lower() else "user@example.com"
                print(f"\n[Agent] Field '{label}' is 📄 NORMAL. Requesting fill with text: {val}")
                action = {
                    "action": "fill",
                    "element_id": elem_id,
                    "value_token": val
                }
                
            resp = await client.post(f"{API_URL}/agent/action", json=action)
            print(f"[Middleware Response]: Fill '{label}' success={resp.json().get('success')}")

        # Finally click submit
        submit_btn = next((e for e in page_state['elements'] if e.get('type') == 'button'), None)
        if submit_btn:
            print(f"\n[Agent] Clicking submit button: {submit_btn['element_id']}")
            resp = await client.post(f"{API_URL}/agent/action", json={
                "action": "click",
                "element_id": submit_btn['element_id']
            })
            print(f"[Middleware Response]: Click success={resp.json().get('success')}")

        print("\n--- Demo Complete ---")
        print("Note: The agent processed and interacted with all form fields while receiving ONLY redacted tokens for sensitive PII!")

if __name__ == "__main__":
    asyncio.run(run_demo())
