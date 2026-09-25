"""
Gemini IDX Pro — minimal orchestration skeleton.

Requires:
    pip install google-genai

This file intentionally does NOT invent MAXLONG HTTP paths.
Implement execute_maxlong_tool() with your existing backend/client.
"""

import json
import os
from pathlib import Path
from google import genai

ROOT = Path(__file__).resolve().parents[1]
SYSTEM = (ROOT / "SYSTEM_INSTRUCTION_GEMINI.md").read_text(encoding="utf-8")
TOOLS = json.loads((ROOT / "gemini_function_declarations.json").read_text(encoding="utf-8"))["tools"]

MODEL = os.environ.get("GEMINI_MODEL", "YOUR_GEMINI_MODEL")
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def execute_maxlong_tool(name: str, arguments: dict) -> dict:
    """
    Bind this to your real MAXLONG action/backend.
    Must return JSON-serializable data.
    Do NOT silently replace failures with web/Python market data.
    """
    raise NotImplementedError(f"Bind MAXLONG handler for {name}")

def run_turn(user_text: str, previous_interaction_id: str | None = None):
    interaction = client.interactions.create(
        model=MODEL,
        system_instruction=SYSTEM,
        input=user_text,
        tools=TOOLS,
        previous_interaction_id=previous_interaction_id,
    )

    current = interaction

    # Continue until there are no more function_call steps.
    while True:
        calls = [s for s in current.steps if getattr(s, "type", None) == "function_call"]
        if not calls:
            return {
                "interaction_id": current.id,
                "text": current.output_text,
            }

        function_results = []
        for call in calls:
            try:
                result = execute_maxlong_tool(call.name, dict(call.arguments))
            except Exception as exc:
                result = {
                    "ok": False,
                    "function": call.name,
                    "errorCode": "ADAPTER_EXCEPTION",
                    "message": str(exc),
                    "retryable": False,
                }

            function_results.append({
                "type": "function_result",
                "name": call.name,
                "call_id": call.id,
                "result": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}],
            })

        current = client.interactions.create(
            model=MODEL,
            system_instruction=SYSTEM,
            input=function_results,
            tools=TOOLS,
            previous_interaction_id=current.id,
        )

if __name__ == "__main__":
    result = run_turn("BBCA fase 1 step auto mendalam konservatif")
    print(result["text"])
