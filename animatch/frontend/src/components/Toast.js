import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

// Context used to expose toast (notification) function globally
const ToastContext = createContext(null);

// Provider wraps the app and manages toast state + rendering
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Adds a new toast and automatically removes it after 3 seconds
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now(); // unique id based on timestamp

    // append new toast to existing list
    setToasts(prev => [...prev, { id, message, type }]);

    // auto-remove toast after delay
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // maps toast types to theme colors
  const colorMap = {
    success: "var(--teal)",
    info:    "var(--purple)",
    error:   "var(--red)",
    warning: "var(--yellow)"
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}

      {/* Toast container fixed to bottom-right of screen */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
          pointerEvents: "none" // allows clicks to pass through
        }}
      >
        {/* render each active toast */}
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
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
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* animation for toast entry */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
}

// custom hook to allow any component to trigger a toast
export function useToast() {
  return useContext(ToastContext);
}