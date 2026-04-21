import { useEffect, useRef } from "react";

import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import Topbar from "./components/Topbar.jsx";
import { useHouseholdPowerApp } from "./hooks/useHouseholdPowerApp.js";
import { VIEW_COMPONENTS } from "./views/viewRegistry.js";

export default function App() {
  const app = useHouseholdPowerApp();
  const frameRef = useRef(0);
  const ActiveView = VIEW_COMPONENTS[app.currentView] || VIEW_COMPONENTS.overview;
  const activeViewProps = app.viewProps[app.currentView] || app.viewProps.overview;

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      return undefined;
    }

    const root = document.documentElement;
    const spring = 0.14;
    const opacitySpring = 0.12;
    const settleDistance = 0.35;
    const pointerState = {
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight * 0.28,
      currentX: window.innerWidth / 2,
      currentY: window.innerHeight * 0.28,
      targetOpacity: 0,
      currentOpacity: 0,
      running: false
    };

    function setPointerGlow(x, y, opacity) {
      root.style.setProperty("--pointer-x", `${x}px`);
      root.style.setProperty("--pointer-y", `${y}px`);
      root.style.setProperty("--pointer-glow-opacity", `${opacity}`);
    }

    function animatePointerGlow() {
      const deltaX = pointerState.targetX - pointerState.currentX;
      const deltaY = pointerState.targetY - pointerState.currentY;
      const deltaOpacity = pointerState.targetOpacity - pointerState.currentOpacity;

      pointerState.currentX += deltaX * spring;
      pointerState.currentY += deltaY * spring;
      pointerState.currentOpacity += deltaOpacity * opacitySpring;

      setPointerGlow(pointerState.currentX, pointerState.currentY, pointerState.currentOpacity.toFixed(3));

      const isSettled =
        Math.abs(deltaX) < settleDistance &&
        Math.abs(deltaY) < settleDistance &&
        Math.abs(deltaOpacity) < 0.01;

      if (isSettled) {
        pointerState.currentX = pointerState.targetX;
        pointerState.currentY = pointerState.targetY;
        pointerState.currentOpacity = pointerState.targetOpacity;
        setPointerGlow(pointerState.currentX, pointerState.currentY, pointerState.currentOpacity.toFixed(3));
        pointerState.running = false;
        frameRef.current = 0;
        return;
      }

      frameRef.current = window.requestAnimationFrame(animatePointerGlow);
    }

    function ensureAnimation() {
      if (pointerState.running) {
        return;
      }

      pointerState.running = true;
      frameRef.current = window.requestAnimationFrame(animatePointerGlow);
    }

    function handlePointerMove(event) {
      pointerState.targetX = event.clientX;
      pointerState.targetY = event.clientY;
      pointerState.targetOpacity = 0.72;
      ensureAnimation();
    }

    function handlePointerExit() {
      pointerState.targetOpacity = 0;
      ensureAnimation();
    }

    setPointerGlow(pointerState.currentX, pointerState.currentY, 0);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", handlePointerExit);
    document.addEventListener("mouseleave", handlePointerExit);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handlePointerExit);
      document.removeEventListener("mouseleave", handlePointerExit);
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--pointer-glow-opacity");
    };
  }, []);

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
