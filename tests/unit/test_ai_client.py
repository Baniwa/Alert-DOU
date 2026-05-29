from unittest.mock import MagicMock, patch

import pytest

from ai.client import GeminiClient, _detect_section, _load_prompt


class TestDetectSection:
    def test_section1_default(self):
        assert _detect_section("Diário Oficial da União - Seção 1") == "secao1"

    def test_section2(self):
        assert _detect_section("Diário Oficial da União - Seção 2") == "secao2"

    def test_section3(self):
        assert _detect_section("Diário Oficial da União - Seção 3") == "secao3"

    def test_unknown_defaults_to_section1(self):
        assert _detect_section("Edição Extra") == "secao1"


class TestLoadPrompt:
    def test_loads_section1_prompt(self):
        prompt = _load_prompt("secao1")
        assert "Seção 1" in prompt
        assert "Atos Normativos" in prompt

    def test_loads_section2_prompt(self):
        prompt = _load_prompt("secao2")
        assert "Seção 2" in prompt

    def test_loads_section3_prompt(self):
        prompt = _load_prompt("secao3")
        assert "Seção 3" in prompt

    def test_unknown_key_falls_back_to_section1(self):
        prompt = _load_prompt("unknown")
        assert "Seção 1" in prompt


class TestGeminiClient:
    def test_raises_without_api_key(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        with pytest.raises(EnvironmentError, match="GEMINI_API_KEY"):
            GeminiClient()

    def test_summarize_returns_model_text(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")

        mock_response = MagicMock()
        mock_response.text = "Resumo executivo gerado pela IA."

        mock_models = MagicMock()
        mock_models.generate_content.return_value = mock_response

        mock_genai_client = MagicMock()
        mock_genai_client.models = mock_models

        with patch("ai.client.genai.Client", return_value=mock_genai_client):
            client = GeminiClient()
            result = client.summarize("conteúdo do DOU seção 1", "secao1")

        assert result == "Resumo executivo gerado pela IA."
        mock_models.generate_content.assert_called_once()
        call_kwargs = mock_models.generate_content.call_args
        assert "gemini-2.0-flash" in str(call_kwargs)

    def test_summarize_includes_prompt_and_content(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")

        captured = {}

        def fake_generate(model, contents):
            captured["contents"] = contents
            resp = MagicMock()
            resp.text = "ok"
            return resp

        mock_genai_client = MagicMock()
        mock_genai_client.models.generate_content.side_effect = fake_generate

        with patch("ai.client.genai.Client", return_value=mock_genai_client):
            client = GeminiClient()
            client.summarize("TEXTO DO DOU", "secao2")

        assert "TEXTO DO DOU" in captured["contents"]
        assert "Seção 2" in captured["contents"]
