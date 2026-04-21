import { requestJson } from "../lib/api.js";

export function createUser(payload) {
  return requestJson("/users/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchUser(userId) {
  return requestJson(`/users/${userId}`);
}

export function fetchLlmConfig() {
  return requestJson("/llm/config");
}

export function testLlmConfig(payload) {
  return requestJson("/llm/test", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function diagnoseLlmConfig(payload) {
  return requestJson("/llm/test/diagnostic", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function saveLlmConfig(payload) {
  return requestJson("/llm/config", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function clearLlmConfig() {
  return requestJson("/llm/config", {
    method: "DELETE"
  });
}

export function fetchUsage(userId) {
  return requestJson(`/usage/${userId}`);
}

export function uploadUsage(payload) {
  return requestJson("/usage/upload", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function runMonthlyPrediction(payload) {
  return requestJson("/predict/monthly", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchLatestPrediction(userId) {
  return requestJson(`/predict/${userId}`);
}

export function regenerateAdvice(payload) {
  return requestJson("/advice/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchChatHistory(userId) {
  return requestJson(`/chat/${userId}`);
}

export function sendChatMessage(payload) {
  return requestJson("/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function simulateScenario(payload) {
  return requestJson("/scenario/simulate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
