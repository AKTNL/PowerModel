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
          kicker="家庭信息"
          title="家庭画像"
          note="先创建家庭用户，再将历史用电、预测记录与建议分析绑定到这个家庭。这个页面聚焦录入和维护基础画像信息。"
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
            <div className="intro-pill">
              <span>建议策略</span>
              <strong>先核心信息，后细节补充</strong>
            </div>
          </div>

          <form className="form-shell" onSubmit={onSubmit}>
            <section className="form-section">
              <div className="form-section-head">
                <p className="form-section-kicker">基础身份</p>
                <h3>先建立家庭主体</h3>
                <p className="form-section-copy">用户名、家庭人数和房屋面积决定了后续记录、预测和问答绑定到哪个家庭主体。</p>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-field-label">用户名</span>
                  <input
                    name="username"
                    value={profileForm.username}
                    onChange={onChange}
                    placeholder="例如 demo_home"
                    required
                  />
                  <span className="form-field-hint">建议使用稳定、可识别的家庭标识，后续历史用电和预测都会挂到这里。</span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">家庭人数</span>
                  <input
                    name="family_size"
                    type="number"
                    min="1"
                    value={profileForm.family_size}
                    onChange={onChange}
                    placeholder="3"
                  />
                  <span className="form-field-hint">人数通常会影响热水、空调和日常设备使用强度。</span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">房屋面积</span>
                  <input
                    name="house_area"
                    type="number"
                    min="0"
                    step="0.1"
                    value={profileForm.house_area}
                    onChange={onChange}
                    placeholder="92"
                  />
                  <span className="form-field-hint">面积越大，制冷制热和照明等基础负荷通常越高。</span>
                </label>
              </div>
            </section>

            <section className="form-section form-section-emphasis">
              <div className="form-section-head">
                <p className="form-section-kicker">设备与习惯</p>
                <h3>补充影响较大的生活特征</h3>
                <p className="form-section-copy">这部分信息会直接影响建议文本的针对性，不需要极度精细，但建议先把高影响字段填完整。</p>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-field-label">空调数量</span>
                  <input
                    name="air_conditioner_count"
                    type="number"
                    min="0"
                    value={profileForm.air_conditioner_count}
                    onChange={onChange}
                    placeholder="2"
                  />
                  <span className="form-field-hint">空调是最常见的高耗电设备之一，建议优先录入。</span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">热水器类型</span>
                  <input
                    name="water_heater_type"
                    value={profileForm.water_heater_type}
                    onChange={onChange}
                    placeholder="电热水器"
                  />
                  <span className="form-field-hint">例如电热水器、燃气热水器等，不需要写得过细。</span>
                </label>

                <label className="form-field field-span-2">
                  <span className="form-field-label">烹饪方式</span>
                  <input
                    name="cooking_type"
                    value={profileForm.cooking_type}
                    onChange={onChange}
                    placeholder="电磁炉 / 燃气"
                  />
                  <span className="form-field-hint">填写日常主要烹饪方式即可，便于后续建议更贴近真实场景。</span>
                </label>
              </div>
            </section>

            <div className="form-action-bar">
              <div className="form-action-meta">
                <div className="form-status-badge">待提交</div>
                <p className="form-action-note">先创建家庭主体，再去“历史用电”页面补 3 到 12 个月的数据，后续预测效果会更稳定。</p>
              </div>

              <div className="form-actions form-actions-priority">
                <button type="submit" className="primary-button">
                  创建用户
                </button>
                <button type="button" className="ghost-button" onClick={onFillDemo}>
                  填充示例
                </button>
              </div>
            </div>
          </form>
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">当前状态</p>
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
              <p className="panel-kicker">录入建议</p>
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
