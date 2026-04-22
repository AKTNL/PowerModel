import { useState } from "react";

import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import Topbar from "./components/Topbar.jsx";
import { useHouseholdPowerApp } from "./hooks/useHouseholdPowerApp.js";
import { VIEW_COMPONENTS } from "./views/viewRegistry.js";

export default function App() {
  const app = useHouseholdPowerApp();
  const [navProgress, setNavProgress] = useState(0);
  const ActiveView = VIEW_COMPONENTS[app.currentView] || VIEW_COMPONENTS.overview;
  const activeViewProps = app.viewProps[app.currentView] || app.viewProps.overview;

  function handleContentScroll(event) {
    const nextProgress = Math.min(event.currentTarget.scrollTop / 120, 1);
    setNavProgress((current) => (Math.abs(current - nextProgress) < 0.01 ? current : nextProgress));
  }

  return (
    <div className="app-shell">
      <Sidebar {...app.sidebarProps} compactProgress={navProgress} />

      <main className="content-shell" onScroll={handleContentScroll}>
        <Topbar {...app.topbarProps} />

        <div className="view-stack">
          <ActiveView {...activeViewProps} />
        </div>
      </main>

      <Toast toast={app.toast} />
    </div>
  );
}
