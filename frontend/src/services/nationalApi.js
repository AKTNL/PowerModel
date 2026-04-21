import { requestJson } from "../lib/api.js";

export function fetchNationalMeta() {
  return requestJson("/api/national/meta");
}

export function fetchNationalDefaultDataset() {
  return requestJson("/api/national/datasets/default");
}

export function validateNationalDataset(payload) {
  return requestJson("/api/national/datasets/validate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function runNationalForecast(payload) {
  return requestJson("/api/national/forecast/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function polishNationalReport(payload) {
  return requestJson("/api/national/report/polish", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function askNationalQuestion(payload) {
  return requestJson("/api/national/qa", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
