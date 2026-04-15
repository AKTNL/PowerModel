# 家庭用电预测与节能建议助手

这是一个面向课程项目或比赛原型的 `FastAPI` + 静态前端 Demo，用于支撑家庭月度用电预测、节能建议生成、智能问答和情景模拟。

## 当前能力

- 创建家庭用户画像
- 配置用户自己的 OpenAI 兼容模型
- 录入和查询月度用电数据
- 支持表格录入、CSV 导入和模板下载
- 预测下个月用电量、电费和波动区间
- 生成原因分析、节能建议和问答回复
- 支持情景模拟

## 项目结构

```text
app/
  main.py
  database.py
  models.py
  schemas.py
  routers/
  services/
frontend/
  index.html
  styles.css
  app.js
requirements.txt
```

## 启动方式

```powershell
C:\Users\kevinchang\AppData\Local\Programs\Python\Python312\python.exe -m venv .venv312
.\.venv312\Scripts\python.exe -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
.\.venv312\Scripts\python.exe -m uvicorn app.main:app --reload
```

启动后访问：

- 前端 Demo：`http://127.0.0.1:8000/`
- 健康检查：`http://127.0.0.1:8000/health`
- Swagger 文档：`http://127.0.0.1:8000/docs`

## 前端操作流程

1. 先创建一个家庭用户
2. 可选地填写自己的 `base_url / api_key / model_name` 并测试连接
3. 用表格直接录入，或导入 CSV，再上传过去几个月的家庭月度用电数据
4. 点击“开始预测”，查看预测结果、原因和节电建议
5. 继续使用“情景模拟”和“智能问答”完成演示

## 推荐接口顺序

1. `POST /users/create`
2. `POST /llm/test`
3. `POST /llm/config`
4. `DELETE /llm/config/{user_id}`
5. `POST /usage/upload`
6. `POST /predict/monthly`
7. `POST /advice/generate`
8. `POST /chat`
9. `POST /scenario/simulate`

## 示例请求

### 1. 创建用户

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

### 2. 上传月度用电数据

```json
POST /usage/upload
{
  "user_id": 1,
  "records": [
    {"usage_month": "2025-10", "power_kwh": 188, "bill_amount": 105.3, "avg_temperature": 18, "holiday_count": 3},
    {"usage_month": "2025-11", "power_kwh": 201, "bill_amount": 112.6, "avg_temperature": 14, "holiday_count": 2},
    {"usage_month": "2025-12", "power_kwh": 235, "bill_amount": 131.6, "avg_temperature": 8, "holiday_count": 2}
  ]
}
```

### 3. 配置用户自己的模型

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

### 4. 测试模型连通性

```json
POST /llm/test
{
  "provider": "openai-compatible",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-***",
  "model_name": "gpt-4o-mini",
  "temperature": 0.3,
  "enabled": true,
  "prompt": "Reply with OK only."
}
```

## 后续建议

- 将 `app/services/predictor.py` 替换为 `LightGBM` 或 `XGBoost`
- 生产环境不要明文保存 API Key，至少要做加密或改成会话级临时使用
- 继续加入天气、峰谷电价和日级数据特征
