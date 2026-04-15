# 家庭用电预测与节能建议助手

一个面向家庭用电场景的 AI 应用 Demo。

这个项目把两类能力拆开了：

- `数值预测`：由后端预测模块完成，用历史月度用电数据估算下个月的用电量和电费
- `智能解释`：由大模型负责生成原因分析、节能建议和问答回复

当前版本适合课程设计、比赛 Demo 和原型验证。它已经包含完整的前后端：

- 后端：`FastAPI + SQLite`
- 前端：`React + Vite`
- 大模型接入：`OpenAI-compatible /chat/completions`

## 功能特性

- 创建家庭用户和基础画像
- 录入或导入历史月度用电数据
- 预测下个月用电量、电费和波动区间
- 输出预测原因分析和节能建议
- 支持情景模拟，例如减少空调或热水器使用时长
- 支持智能问答
- 支持用户填写自己的模型 `base_url / api_key / model_name`
- 当外部模型不可用时，自动回退到规则版解释和问答

## 技术栈

- Backend: `FastAPI`, `SQLAlchemy`, `Pydantic`, `Uvicorn`
- Frontend: `React`, `Vite`
- Database: `SQLite`
- LLM Access: OpenAI-compatible HTTP API

## 项目结构

```text
app/
  main.py                # FastAPI 入口，同时负责服务前端构建产物
  database.py            # SQLite 和 Session 配置
  models.py              # 数据库模型
  schemas.py             # 请求/响应模型
  routers/               # 各模块 API
  services/              # 预测、建议、LLM 调用逻辑

frontend/
  src/
    components/          # Sidebar / Topbar / Toast / Chart 等组件
    views/               # 各个业务模块页面
    lib/                 # API 请求和前端工具函数
  index.html             # Vite 入口
  styles.css             # 全局样式
  package.json           # 前端依赖和脚本
  vite.config.js         # Vite 配置

requirements.txt         # 后端依赖
```

## 运行环境

建议环境：

- Python `3.12`
- Node.js `18+`
- npm `9+`

如果你是 Windows + PowerShell，建议直接使用文档里的 `python.exe` 和 `npm.cmd` 命令，避免执行策略问题。

## 快速开始

第一次拉取仓库后，必须做两件事：

1. 安装后端依赖
2. 安装并构建前端

因为后端会直接服务 `frontend/dist`，如果你没有先构建前端，打开首页时会看到前端构建缺失提示。

### 1. 克隆仓库

```powershell
git clone https://github.com/AKTNL/PowerModel.git
cd PowerModel
```

### 2. 创建 Python 虚拟环境

Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

如果你本机有多个 Python，也可以显式指定：

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

### 4. 安装前端依赖

```powershell
cd frontend
npm.cmd install --registry=https://registry.npmmirror.com --no-audit --no-fund
cd ..
```

### 5. 构建前端

```powershell
cd frontend
npm.cmd run build
cd ..
```

构建成功后会生成：

- `frontend/dist/index.html`
- `frontend/dist/assets/...`

### 6. 启动后端

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

启动后访问：

- 首页：`http://127.0.0.1:8000/`
- 健康检查：`http://127.0.0.1:8000/health`
- Swagger 文档：`http://127.0.0.1:8000/docs`

## 推荐的首次演示流程

第一次打开页面，建议按这个顺序操作：

1. 进入 `家庭画像`
2. 创建一个家庭用户
3. 进入 `历史用电`
4. 点击 `填充示例`，或者导入你自己的 CSV
5. 点击 `上传记录`
6. 进入 `预测与建议`
7. 点击 `运行预测`
8. 如果你有自己的大模型 API，再进入 `模型设置` 测试并保存
9. 回到 `预测与建议` 点击 `重新生成建议`
10. 最后到 `情景模拟` 和 `智能问答` 继续演示

## 如何接入你自己的大模型

这个项目支持用户自行填写模型配置，但要求接口兼容 OpenAI 的 `chat/completions`。

在前端 `模型设置` 页面填写：

- `provider`: 固定用 `openai-compatible`
- `base_url`: 例如 `https://api.openai.com/v1`
- `api_key`
- `model_name`: 例如 `gpt-4o-mini`
- `temperature`

推荐流程：

1. 先点击 `测试连接`
2. 测试成功后再点击 `保存配置`
3. 回到 `预测与建议` 或 `智能问答` 查看效果

### 支持示例

- OpenAI
- DeepSeek OpenAI-compatible 接口
- 智谱/通义等兼容 OpenAI 协议的代理层
- 自建本地兼容服务

### 注意事项

- 当前版本会把用户填写的模型配置保存在本地 SQLite 数据库中
- `GET /llm/config/{user_id}` 返回时会掩码显示 API Key
- 这是课程/原型项目，不适合直接作为生产级密钥管理方案

## 历史用电数据格式

页面支持手工录入，也支持导入 CSV。

CSV 表头格式：

```csv
usage_month,power_kwh,bill_amount,avg_temperature,holiday_count
2025-10,188,105.3,18,3
2025-11,201,112.6,14,2
2025-12,235,131.6,8,2
```

字段说明：

- `usage_month`: 月份，格式必须是 `YYYY-MM`
- `power_kwh`: 月度用电量，必填
- `bill_amount`: 月电费，可选
- `avg_temperature`: 平均温度，可选
- `holiday_count`: 节假日天数，可选

## 本地开发模式

### 方式一：只跑后端，使用构建后的前端

这是最简单、最适合演示的方式。

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

然后访问：

```text
http://127.0.0.1:8000/
```

### 方式二：前后端分离开发

如果你要改 React 页面，建议用 Vite 开发模式。

终端 1，启动后端：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

终端 2，启动前端开发服务器：

```powershell
cd frontend
npm.cmd run dev
```

然后访问：

```text
http://127.0.0.1:5173/
```

`vite.config.js` 里已经配置了接口代理，前端会自动转发到本地 `8000` 后端。

## 数据与存储

项目运行后会在根目录自动生成本地数据库：

- `household_power.db`

这个数据库会保存：

- 用户画像
- 历史用电记录
- 预测记录
- 聊天记录
- 模型配置

## 主要接口

核心接口如下：

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
12. `POST /llm/config`
13. `GET /llm/config/{user_id}`
14. `DELETE /llm/config/{user_id}`

更详细的请求/响应可以直接看：

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

### 上传历史用电

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
    },
    {
      "usage_month": "2025-11",
      "power_kwh": 201,
      "bill_amount": 112.6,
      "avg_temperature": 14,
      "holiday_count": 2
    },
    {
      "usage_month": "2025-12",
      "power_kwh": 235,
      "bill_amount": 131.6,
      "avg_temperature": 8,
      "holiday_count": 2
    }
  ]
}
```

### 配置模型

```json
POST /llm/config
{
  "user_id": 1,
  "provider": "openai-compatible",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-***",
  "model_name": "gpt-4o-mini",
  "temperature": 0.3,
  "enabled": true
}
```

### 执行预测

```json
POST /predict/monthly
{
  "user_id": 1,
  "target_month": "2026-04"
}
```

### 智能问答

```json
POST /chat
{
  "user_id": 1,
  "question": "为什么我下个月的用电量会上升？"
}
```

## 常见问题

### 1. 打开 `http://127.0.0.1:8000/` 显示前端构建缺失

说明你还没有执行：

```powershell
cd frontend
npm.cmd install
npm.cmd run build
cd ..
```

### 2. 前端样式或页面没有更新

先重新构建：

```powershell
cd frontend
npm.cmd run build
cd ..
```

然后浏览器强制刷新：

```text
Ctrl + F5
```

### 3. PowerShell 下 `npm` 无法执行

有些机器会遇到执行策略限制，直接改用：

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

### 4. 问答或建议没有走大模型

这是正常的降级行为。常见原因：

- `base_url` 不正确
- `api_key` 无效
- 模型名不正确
- 外部接口超时或不可达

项目会自动回退到规则版，不会让主流程中断。

### 5. 预测时报错 “At least 3 months of usage data are required for prediction”

当前版本至少需要 `3` 个月的历史数据才能执行预测。

### 6. 为什么预测不是 LightGBM / XGBoost？

当前仓库里的预测模块还是规则版 MVP，目的是先把产品链路跑通：

- 数据录入
- 预测结果
- 大模型解释
- 建议生成
- 问答交互

如果你后续要继续升级，优先改这个文件：

- `app/services/predictor.py`

## 后续可扩展方向

- 把规则预测替换成 `LightGBM / XGBoost`
- 增加日级或小时级用电预测
- 支持峰谷电价分析
- 增加导出 PDF/报告功能
- 接入真实电表或账单数据
- 加入异常用电预警

## 许可证

当前仓库未单独声明开源许可证。如果你打算公开长期维护，建议补充 `LICENSE` 文件。
