import Panel from "../components/Panel.jsx";

export default function ProfileView({
  profileForm,
  onChange,
  onSubmit,
  onFillDemo,
  currentUsername,
  userId
}) {
  return (
    <div className="module-view is-active" data-view="profile">
      <Panel
        kicker="Profile"
        title="家庭画像"
        note="先创建一个家庭用户，后续的历史数据、模型配置和预测结果都会绑定在这个用户下。"
      >
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            用户名
            <input
              name="username"
              value={profileForm.username}
              onChange={onChange}
              placeholder="例如 demo_home"
              required
            />
          </label>
          <label>
            家庭人数
            <input
              name="family_size"
              type="number"
              min="1"
              value={profileForm.family_size}
              onChange={onChange}
              placeholder="3"
            />
          </label>
          <label>
            房屋面积
            <input
              name="house_area"
              type="number"
              min="0"
              step="0.1"
              value={profileForm.house_area}
              onChange={onChange}
              placeholder="92"
            />
          </label>
          <label>
            空调数量
            <input
              name="air_conditioner_count"
              type="number"
              min="0"
              value={profileForm.air_conditioner_count}
              onChange={onChange}
              placeholder="2"
            />
          </label>
          <label>
            热水器类型
            <input
              name="water_heater_type"
              value={profileForm.water_heater_type}
              onChange={onChange}
              placeholder="电热水器"
            />
          </label>
          <label>
            烹饪方式
            <input
              name="cooking_type"
              value={profileForm.cooking_type}
              onChange={onChange}
              placeholder="电磁炉 / 燃气"
            />
          </label>

          <div className="form-actions field-span-2">
            <button type="submit" className="primary-button">
              创建用户
            </button>
            <button type="button" className="ghost-button" onClick={onFillDemo}>
              填充示例
            </button>
          </div>
        </form>

        <div className="summary-grid">
          <article className="summary-card">
            <span>当前用户名</span>
            <strong>{currentUsername || "--"}</strong>
            <p>{currentUsername ? "当前页面状态已经绑定到这个家庭用户。" : "还没有创建用户。"}</p>
          </article>
          <article className="summary-card">
            <span>用户 ID</span>
            <strong>{userId || "--"}</strong>
            <p>内部接口仍然使用用户 ID，但页面会优先展示用户名。</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}
