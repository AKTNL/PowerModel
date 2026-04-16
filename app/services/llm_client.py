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


def _should_disable_thinking(config: LLMRuntimeConfig) -> bool:
    model_name = config.model_name.lower()
    base_url = config.base_url.lower()
    return model_name.startswith("glm-4.7") or ("bigmodel.cn" in base_url and model_name.startswith("glm-"))


def _extract_error_message(body: str) -> str:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return body

    error_payload = payload.get("error")
    if isinstance(error_payload, dict):
        message = error_payload.get("message")
        code = error_payload.get("code")
        if message and code:
            return f"{message} (code: {code})"
        if message:
            return str(message)

    message = payload.get("message")
    if message:
        return str(message)
    return body


def _extract_content(payload: dict) -> str:
    choices = payload.get("choices") or []
    if not choices:
        raise LLMServiceError("The model response did not include any choices.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        text = content.strip()
        if text:
            return text

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                parts.append(str(item["text"]))
        text = "\n".join(parts).strip()
        if text:
            return text

    if message.get("reasoning_content"):
        finish_reason = choices[0].get("finish_reason")
        if finish_reason == "length":
            raise LLMServiceError(
                "The model used up the output budget on reasoning and did not return a final answer."
            )
        raise LLMServiceError(
            "The model returned reasoning content but no final answer."
        )

    if isinstance(choices[0].get("text"), str):
        text = choices[0]["text"].strip()
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
    request_payload = {
        "model": config.model_name,
        "messages": messages,
        "temperature": config.temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    if _should_disable_thinking(config):
        request_payload["thinking"] = {"type": "disabled"}

    payload = json.dumps(request_payload).encode("utf-8")

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
        message = _extract_error_message(body)
        raise LLMServiceError(f"LLM request failed with HTTP {exc.code}: {message}") from exc
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
