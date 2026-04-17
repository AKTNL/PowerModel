import { useEffect, useRef, useState } from "react";

const DEFAULT_TOAST = {
  visible: false,
  tone: "info",
  message: ""
};

export function useToast() {
  const [toast, setToast] = useState(DEFAULT_TOAST);
  const timerRef = useRef(null);

  function showToast(message, tone = "info") {
    setToast({
      visible: true,
      tone,
      message: message || "操作失败"
    });

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 2800);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    toast,
    showToast
  };
}
