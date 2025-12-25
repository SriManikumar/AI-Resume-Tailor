import os
import json
import re
from google import genai

class GeminiClient:
    def __init__(self, model: str):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing. Put it in backend/.env")

        self.client = genai.Client(api_key=api_key)
        self.model = model

    def generate_text(self, prompt: str) -> str:
        resp = self.client.models.generate_content(
            model=self.model,
            contents=prompt
        )
        return (resp.text or "").strip()

    def _extract_json_object(self, text: str) -> str:
        # 1) empty output guard
        if not text or not text.strip():
            raise ValueError("Model returned empty output.")

        t = text.strip()

        # 2) remove markdown fences if present
        t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"^```\s*", "", t)
        t = re.sub(r"\s*```$", "", t)

        # 3) extract first {...}
        start = t.find("{")
        end = t.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"Model did not return JSON object. Raw:\n{t[:600]}")
        return t[start:end + 1]

    def generate_json(self, prompt: str, schema_hint: str) -> dict:
        # Attempt 1
        raw = self.generate_text(
            prompt
            + "\n\nReturn ONLY valid JSON. No markdown. No explanations.\n"
            + schema_hint
        )

        print("\n--- GEMINI RAW (attempt 1) ---\n", raw[:800], "\n--- END ---\n")

        try:
            extracted = self._extract_json_object(raw)
            return json.loads(extracted)
        except Exception:
            # Attempt 2 with stricter instruction
            raw2 = self.generate_text(
                "Return ONLY a JSON object matching this schema. No extra text.\n"
                + schema_hint
                + "\n\nNow answer this request:\n"
                + prompt
            )

            print("\n--- GEMINI RAW (attempt 2) ---\n", raw2[:800], "\n--- END ---\n")

            extracted2 = self._extract_json_object(raw2)
            return json.loads(extracted2)
