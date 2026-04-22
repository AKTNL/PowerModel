# 家庭 + 国家用电预测平台

一个面向能源预测场景的全栈 AI 应用 Demo。项目把家庭月度用电预测、国家级月度用电预测、模型接入、分析报告和智能问答整合到同一个浅色数据工作台中，方便演示完整的数据录入、预测、解释和问答闭环。

核心思路：

- `数值预测`：后端负责家庭规则加权预测和国家级 SARIMA 时间序列预测。
- `智能解释`：OpenAI 兼容大模型用于报告润色、预测解释、节能建议和问答。
- `规则兜底`：外部模型不可用时，系统自动回退到本地规则解释和问答，不中断主流程。

## 功能特性

- 家庭画像创建与维护。
- 历史月度用电数据手工录入、示例填充和 CSV 导入。
- 家庭下月用电量、电费区间和节能建议生成。
- 情景模拟，例如减少空调或热水器使用时长后的节电效果。
- 智能问答，支持历史会话回看和当前问题继续追问。
- 国家用电预测总览，支持官方公开数据和自定义 CSV。
- 国家级 SARIMA 预测、预测区间、季节性图表和预测结果表。
- 国家分析报告，支持本地规则报告和云端大模型润色。
- 国家数据来源页面，展示字段说明、官方来源和原始/清洗数据预览。
- 平台级模型设置，家庭模块和国家模块共用一份 OpenAI 兼容配置。
- 浅色数据工作台界面，支持顶部导航和随页面滚动线性收纳的紧凑导航。
- 支持通过 `DATABASE_URL` 在 `SQLite / PostgreSQL` 之间切换。

## 技术栈

- Backend: `FastAPI`, `SQLAlchemy`, `Pydantic`, `Uvicorn`
- Forecast: `pandas`, `numpy`, `statsmodels`, `scipy`
- Frontend: `React 19`, `Vite 7`
- Database: `SQLite / PostgreSQL`
- LLM Access: OpenAI-compatible `chat/completions`

## 预测算法

项目当前包含两套数值预测逻辑：

- 家庭用电预测：使用本地规则加权模型。算法要求至少 `3` 个月历史用电数据，综合 `最近一个月用电量`、`近三个月平均值`、`去年同期用电量或近三月均值兜底`，并叠加夏季/冬季季节因子、空调数量修正、电价估计和 `±12%` 预测区间。该方法解释性强，适合 Demo 中展示“为什么预测会上升或下降”。
- 国家用电预测：使用 `statsmodels` 的 `SARIMAX` 实现 SARIMA 月度时间序列模型。系统会根据样本量尝试多组 `(p,d,q)` 与季节项 `(P,D,Q,12)` 候选参数，选择能够成功拟合的模型，并输出未来月份预测值、置信区间、季节性分布和本地规则分析报告。

大模型不直接替代数值预测；它主要用于预测解释、节能建议、国家报告润色和问答生成。当外部模型不可用时，系统会回退到本地规则文本。

## 项目结构

```text
app/
  main.py                         # FastAPI 入口，同时服务前端构建产物
  database.py                     # 数据库 URL、Engine 和 Session 配置
  models.py                       # 数据库模型
  schemas.py                      # 家庭模块请求/响应模型
  national_schemas.py             # 国家模块请求/响应模型
  routers/                        # 用户、用电、预测、问答、模型、国家模块 API
  services/                       # 预测、建议、LLM、国家模块业务逻辑

src/
  data_loader.py                  # 国家数据加载
  preprocess.py                   # 国家数据清洗
  forecast/sarima_model.py        # 国家 SARIMA 预测模型
  analysis/                       # 国家报告生成和规则问答
  llm/client.py                   # 国家模块 LLM 客户端
  config.py                       # 国家模块字段、预测窗口和默认数据配置

frontend/
  src/
    components/                   # Sidebar / Topbar / Chart / Panel / Toast 等组件
    constants/                    # 前端默认值、模型预设和本地存储键
    hooks/                        # 家庭模块与国家模块状态管理
    lib/                          # 工具函数与视图数据拼装
    services/                     # 前端 API 请求层
    views/                        # Overview / Usage / Prediction / National* 等页面
  index.html
  styles.css                      # 全局浅色数据工作台样式
  package.json
  vite.config.js

data/official/
  national_electricity_consumption_monthly_nea.csv

docs/
  data_schema.md                  # 国家数据字段说明
  official_data_sources.md        # 官方数据来源说明

scripts/
  migrate_sqlite_to_postgres.py   # SQLite 迁移到 PostgreSQL 的一次性脚本

requirements.txt
```

## 运行环境

建议环境：

- Python `3.12`
- Node.js `18+`
- npm `9+`

如果你是 Windows + PowerShell，建议使用文档里的 `python.exe` 和 `npm.cmd` 命令，避免执行策略问题。

## 快速开始

第一次拉取仓库后，需要先安装后端依赖、安装前端依赖并构建前端。后端会直接服务 `frontend/dist`，如果没有构建前端，访问首页会看到构建缺失提示。

### 1. 克隆仓库

```powershell
git clone https://github.com/AKTNL/PowerModel.git
cd PowerModel
```

### 2. 创建 Python 虚拟环境

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

如果本机有多个 Python，也可以显式指定：

```powershell
C:\Users\YourName\AppData\Local\Programs\Python\Python312\python.exe -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

### 3. 安装后端依赖

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

如果网络较慢，可以换国内源：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
```

### 4. 安装并构建前端

```powershell
cd frontend
npm.cmd install --registry=https://registry.npmmirror.com --no-audit --no-fund
npm.cmd run build
cd ..
```

### 5. 启动后端

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

启动后访问：

- 首页：`http://127.0.0.1:8000/`
- 健康检查：`http://127.0.0.1:8000/health`
- Swagger 文档：`http://127.0.0.1:8000/docs`

## 本地开发模式

### 方式一：只跑后端，使用构建后的前端

适合演示和最终检查。

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

访问：

```text
http://127.0.0.1:8000/
```

### 方式二：前后端分离开发

终端 1，启动后端：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

终端 2，启动 Vite：

```powershell
cd frontend
npm.cmd run dev
```

访问：

```text
http://127.0.0.1:5173/
```

`frontend/vite.config.js` 已配置接口代理，前端会自动转发到本地 `8000` 后端。

## 数据库配置

默认使用仓库根目录下的 SQLite：

```text
sqlite:///./household_power.db
```

如需改用 PostgreSQL，在启动前设置 `DATABASE_URL`：

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@127.0.0.1:5432/household_power"
```

启动后可以通过健康检查确认当前数据库后端：

```text
GET /health
```

返回中会包含：

- `database_backend: sqlite`
- 或 `database_backend: postgresql`

当前数据库会保存：

- 家庭用户画像
- 家庭历史用电记录
- 家庭预测记录
- 聊天记录
- 平台级模型配置

如果已有 SQLite 数据需要迁移到 PostgreSQL：

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@127.0.0.1:5432/household_power"
.\.venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py
```

如源 SQLite 不在默认位置，可额外指定：

```powershell
$env:SOURCE_DATABASE_URL = "sqlite:///./household_power.db"
```

## 推荐演示流程

### 家庭模块

1. 进入 `家庭画像`，创建一个家庭用户。
2. 进入 `历史用电`，点击 `填充示例` 或导入 CSV。
3. 点击 `上传记录`。
4. 进入 `预测与建议`，点击 `运行预测`。
5. 如有模型 API，进入 `模型设置`，测试并保存平台模型配置。
6. 回到 `预测与建议`，点击 `重新生成建议`。
7. 进入 `情景模拟` 和 `智能问答` 继续演示。

### 国家模块

1. 进入 `国家预测总览`。
2. 选择 `官方数据` 或上传同结构 CSV。
3. 设置预测月份数，范围为 `6-12`。
4. 点击 `运行国家预测`。
5. 查看历史趋势、预测区间、季节性分布和预测结果表。
6. 进入 `国家分析报告`，查看本地规则报告，也可以使用平台模型进行润色。
7. 进入 `国家数据来源`，查看字段说明、官方来源、原始数据和清洗后数据预览。

## 平台模型配置

项目使用平台级 OpenAI 兼容模型配置，家庭模块和国家模块都会复用这份配置。

在 `模型设置` 页面填写：

- `provider`: 默认 `openai-compatible`
- `base_url`: 例如 `https://api.openai.com/v1`
- `api_key`
- `model_name`: 服务端实际暴露的模型标识
- `temperature`

页面内置常用服务预设：

- 智谱 GLM
- DeepSeek
- Gemini OpenAI-compatible
- OpenAI
- 自定义

推荐流程：

1. 选择服务预设或自定义 Base URL。
2. 点击 `测试连接`。
3. 如需验证国家问答负载，点击 `诊断真实问答`。
4. 测试成功后点击 `保存配置`。

注意：

- API Key 会保存在当前启用的数据库中。
- 接口返回配置时只会显示掩码，不会回显完整 Key。
- 这是课程/原型项目，不适合直接作为生产级密钥管理方案。

## 家庭历史用电 CSV 格式

页面支持手工录入，也支持导入 CSV。

```csv
usage_month,power_kwh,bill_amount,avg_temperature,holiday_count
2025-10,188,105.3,18,3
2025-11,201,112.6,14,2
2025-12,235,131.6,8,2
```

字段说明：

- `usage_month`: 月份，格式为 `YYYY-MM`
- `power_kwh`: 月度用电量，必填
- `bill_amount`: 月电费，可选
- `avg_temperature`: 平均温度，可选
- `holiday_count`: 节假日天数，可选

## 国家数据 CSV 格式

国家模块默认使用：

```text
data/official/national_electricity_consumption_monthly_nea.csv
```

上传 CSV 至少需要包含：

- `date`
- `consumption_billion_kwh`

可选字段：

- `source`
- `source_url`
- `note`

字段说明和官方来源文档见：

- `docs/data_schema.md`
- `docs/official_data_sources.md`

## 主要接口

### 家庭与平台接口

1. `POST /users/create`
2. `GET /users/{user_id}`
3. `POST /usage/upload`
4. `GET /usage/{user_id}`
5. `POST /predict/monthly`
6. `GET /predict/{user_id}`
7. `POST /advice/generate`
8. `POST /chat`
9. `GET /chat/{user_id}`
10. `POST /scenario/simulate`
11. `POST /llm/test`
12. `POST /llm/test/diagnostic`
13. `POST /llm/config`
14. `GET /llm/config`
15. `DELETE /llm/config`
16. `POST /llm/config/user`
17. `GET /llm/config/user/{user_id}`
18. `DELETE /llm/config/user/{user_id}`

### 国家模块接口

1. `GET /api/national/meta`
2. `GET /api/national/datasets/default`
3. `POST /api/national/datasets/validate`
4. `POST /api/national/forecast/run`
5. `POST /api/national/report/polish`
6. `POST /api/national/qa`
7. `POST /api/national/llm/test`
8. `POST /api/national/llm/config`
9. `GET /api/national/llm/config`
10. `DELETE /api/national/llm/config`

更详细的请求和响应可以查看：

- `http://127.0.0.1:8000/docs`

## 示例请求

### 创建用户

```json
POST /users/create
{
  "username": "demo_user",
  "family_size": 3,
  "house_area": 92,
  "air_conditioner_count": 2,
  "water_heater_type": "电热水器",
  "cooking_type": "电磁炉"
}
```

### 上传家庭历史用电

```json
POST /usage/upload
{
  "user_id": 1,
  "records": [
    {
      "usage_month": "2025-10",
      "power_kwh": 188,
      "bill_amount": 105.3,
      "avg_temperature": 18,
      "holiday_count": 3
    }
  ]
}
```

### 配置平台模型

```json
POST /llm/config
{
  "provider": "openai-compatible",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-***",
  "model_name": "gpt-4o-mini",
  "temperature": 0.3,
  "enabled": true
}
```

### 执行家庭预测

```json
POST /predict/monthly
{
  "user_id": 1,
  "target_month": "2026-04"
}
```

### 运行国家预测

```json
POST /api/national/forecast/run
{
  "dataset_source": "default",
  "forecast_periods": 12
}
```

### 国家智能问答

```json
POST /api/national/qa
{
  "question": "未来一年哪几个月可能出现高峰？",
  "history": [],
  "forecast": [],
  "stats": {
    "record_count": 0,
    "history_start": "",
    "history_end": "",
    "latest_month": "",
    "latest_value": 0,
    "average_value": 0,
    "max_value": 0,
    "min_value": 0,
    "max_month": "",
    "min_month": "",
    "seasonal_peak_months": [],
    "seasonal_low_months": []
  },
  "qa_mode": "cloud_rewrite"
}
```

实际使用时，前端会自动把当前国家预测结果中的 `history / forecast / stats` 传入问答接口。

## 常见问题

### 1. 打开首页显示前端构建缺失

说明还没有构建前端：

```powershell
cd frontend
npm.cmd install
npm.cmd run build
cd ..
```

### 2. 前端样式或页面没有更新

重新构建前端并强制刷新浏览器：

```powershell
cd frontend
npm.cmd run build
cd ..
```

浏览器中执行：

```text
Ctrl + F5
```

### 3. PowerShell 下 `npm` 无法执行

使用 `npm.cmd`：

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

### 4. 问答、建议或报告没有走大模型

这是正常降级行为。常见原因：

- `base_url` 不正确
- `api_key` 无效
- `model_name` 不正确
- 外部接口超时或不可达
- 当前没有保存平台级模型配置

项目会自动回退到本地规则逻辑，不会让主流程中断。

### 5. 历史问答里出现 `????`

通常不是 SQLite 不支持中文，而是输入链路在写入数据库前已经把文本损坏成问号。

当前版本做了两层保护：

- 前端会拦截“全是问号”的异常问题输入。
- 后端 `ChatRequest` 校验会拒绝只包含占位问号的内容。

如果旧记录已经写成 `????`，迁移到 PostgreSQL 后也不会自动恢复。

### 6. 家庭预测提示至少需要 3 个月历史数据

家庭模块至少需要 `3` 个月历史数据才能执行预测。

### 7. 国家预测上传 CSV 校验失败

请确认 CSV 至少包含：

- `date`
- `consumption_billion_kwh`

并且日期、数值格式可被 pandas 正确解析。

### 8. 国家预测为什么使用 SARIMA？

国家模块是月度时间序列预测场景，当前版本使用 `SARIMA` 保持解释性和可演示性，并输出预测区间、季节性分析和本地规则报告。

## 后续可扩展方向

- 将家庭规则预测升级为 `LightGBM / XGBoost`。
- 增加日级或小时级用电预测。
- 支持峰谷电价分析。
- 增加 PDF/Markdown 报告导出。
- 接入真实电表、账单或更多官方宏观数据。
- 增加异常用电预警。
- 增加用户级权限、密钥加密和生产级配置管理。

## 许可证

本项目基于 `MIT License` 开源，详见仓库根目录的 `LICENSE` 文件。
