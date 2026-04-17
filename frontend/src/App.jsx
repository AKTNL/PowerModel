import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import Topbar from "./components/Topbar.jsx";
import { useHouseholdPowerApp } from "./hooks/useHouseholdPowerApp.js";
import { VIEW_COMPONENTS } from "./views/viewRegistry.js";

export default function App() {
  const app = useHouseholdPowerApp();
  const ActiveView = VIEW_COMPONENTS[app.currentView] || VIEW_COMPONENTS.overview;
  const activeViewProps = app.viewProps[app.currentView] || app.viewProps.overview;

  return (
    <div className={`app-shell ${app.isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`.trim()}>
      <Sidebar {...app.sidebarProps} />

      <main className="content-shell">
        <Topbar {...app.topbarProps} />

        <div className="view-stack">
          <ActiveView {...activeViewProps} />
        </div>
      </main>

      <Toast toast={app.toast} />
    </div>
  );
}
