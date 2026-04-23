export const STORAGE_KEYS = {
  activeView: "household_power_active_view",
  userId: "household_power_user_id",
  username: "household_power_username",
  sidebarCollapsed: "household_power_sidebar_collapsed"
};

export const DEFAULT_PROFILE_FORM = {
  username: "",
  family_size: "",
  house_area: "",
  air_conditioner_count: "",
  water_heater_type: "",
  cooking_type: ""
};

export const DEFAULT_MODEL_FORM = {
  service_preset: "custom",
  provider: "openai-compatible",
  base_url: "",
  api_key: "",
  model_name: "",
  temperature: "0.3"
};

export const DEFAULT_SCENARIO_FORM = {
  reduce_ac_hours_per_day: "",
  ac_setpoint_delta_c: "",
  water_heater_mode: "keep",
  away_days: ""
};

export const DEFAULT_LLM_PREVIEW = {
  tone: "muted",
  text: "尚未测试模型连接。"
};

export const DEFAULT_SCENARIO_RESULT = {
  empty: true,
  summary: "运行模拟后会在这里显示节电效果。",
  baseline_kwh: 0,
  baseline_bill: 0,
  simulated_kwh: 0,
  simulated_bill: 0,
  saved_kwh: 0,
  saved_bill: 0,
  scenario_contributions: []
};
