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
      <div className="page-grid">
        <Panel
          kicker="Profile"
          title="家庭画像"
          note="先创建家庭用户，再把历史用电、模型配置和预测记录都绑定到这个家庭。这个页面现在只负责录入和管理家庭基础信息。"
        >
          <div className="page-intro-strip">
            <div className="intro-pill">
              <span>当前状态</span>
              <strong>{currentUsername ? "已绑定家庭" : "等待创建"}</strong>
            </div>
            <div className="intro-pill">
              <span>下一步</span>
              <strong>录入历史用电</strong>
            </div>
          </div>

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
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Binding</p>
              <h3>当前绑定状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile">
                <span>当前用户</span>
                <strong>{currentUsername || "--"}</strong>
                <p>{currentUsername ? "当前页面操作会绑定到这个家庭用户。" : "还没有创建家庭用户。"}</p>
              </article>
              <article className="status-tile status-warm">
                <span>用户 ID</span>
                <strong>{userId || "--"}</strong>
                <p>接口内部仍使用 ID 作为主键，页面只把它作为辅助信息展示。</p>
              </article>
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Guide</p>
              <h3>录入建议</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>优先录入影响大的特征</strong>
                <p>家庭人数、空调数量、热水器类型会直接影响节能建议的针对性。</p>
              </div>
              <div className="info-list-item">
                <strong>不要追求过度细化</strong>
                <p>第一版只需要把对月度用电有明显影响的信息填完整就够了。</p>
              </div>
              <div className="info-list-item">
                <strong>创建后继续录入历史数据</strong>
                <p>有了用户画像后，再去“历史用电”页面补 3 到 12 个月的数据效果最好。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
