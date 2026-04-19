import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const colorMap = {
    success: "var(--teal)",
    info:    "var(--purple)",
    error:   "var(--red)",
    warning: "var(--yellow)"
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{
        position: "fixed", bottom: "24px", right: "24px",
        display: "flex", flexDirection: "column", gap: "8px",
        zIndex: 9999, pointerEvents: "none"
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "var(--surface2)",
            border: `1px solid ${colorMap[t.type] || colorMap.success}`,
            borderLeft: `4px solid ${colorMap[t.type] || colorMap.success}`,
            color: "var(--text)",
            padding: "12px 18px",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "'Nunito', sans-serif",
            minWidth: "220px",
            animation: "slideIn 0.2s ease",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}