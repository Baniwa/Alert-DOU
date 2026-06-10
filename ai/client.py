import os
from pathlib import Path

from google import genai

_PROMPTS_DIR = Path(__file__).parent / "prompts"
_SECTION_MAP = {
    "secao1": "section1",
    "secao2": "section2",
    "secao3": "section3",
}
_DEFAULT_MODEL = "gemini-3.5-flash"


def _load_prompt(section_key: str) -> str:
    filename = _SECTION_MAP.get(section_key, "section1")
    return (_PROMPTS_DIR / f"{filename}.txt").read_text(encoding="utf-8")


def _detect_section(edition_title: str) -> str:
    title = edition_title.lower()
    if "seção 2" in title or "secao 2" in title or "secção 2" in title:
        return "secao2"
    if "seção 3" in title or "secao 3" in title or "seção 3" in title:
        return "secao3"
    return "secao1"


class GeminiClient:
    def __init__(self, model: str = _DEFAULT_MODEL) -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY not set in environment")
        self._client = genai.Client(api_key=api_key)
        self.model = model

    def summarize(self, content: str, section: str) -> str:
        prompt = _load_prompt(section)
        full_prompt = f"{prompt}\n\n{content}"
        response = self._client.models.generate_content(
            model=self.model,
            contents=full_prompt,
        )
        return response.text
