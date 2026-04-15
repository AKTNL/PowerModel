from __future__ import annotations

import json
from dataclasses import dataclass
from urllib import error, request


class LLMServiceError(Exception):
    pass


@dataclass
class LLMRuntimeConfig:
    base_url: str
    api_key: str
    model_name: str
    temperature: float = 0.3
    provider: str = "openai-compatible"


def mask_api_key(value: str) -> str:
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}{'*' * (len(value) - 8)}{value[-4:]}"


def _chat_completions_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/chat/completions"


def _extract_content(payload: dict) -> str:
    choices = payload.get("choices") or []
    if not choices:
        raise LLMServiceError("The model response did not include any choices.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                parts.append(str(item["text"]))
        text = "\n".join(parts).strip()
        if text:
            return text

    raise LLMServiceError("The model response did not include text content.")


def call_openai_compatible(
    config: LLMRuntimeConfig,
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 800,
    timeout: int = 60,
) -> str:
    payload = json.dumps(
        {
            "model": config.model_name,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
    ).encode("utf-8")

    http_request = request.Request(
        _chat_completions_url(config.base_url),
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.api_key}",
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            raw_body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise LLMServiceError(f"LLM request failed with HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise LLMServiceError(f"Failed to connect to the model endpoint: {exc.reason}") from exc
    except TimeoutError as exc:
        raise LLMServiceError("The model request timed out.") from exc

    try:
        response_payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise LLMServiceError("The model response was not valid JSON.") from exc

    return _extract_content(response_payload)


def test_openai_compatible_connection(config: LLMRuntimeConfig, prompt: str) -> str:
    return call_openai_compatible(
        config=config,
        messages=[
            {
                "role": "system",
                "content": "You are a connectivity test assistant. Reply briefly.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=60,
        timeout=30,
    )

