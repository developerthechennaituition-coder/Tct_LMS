import React from "react";
import { useSelector } from "react-redux";

const GlobalSpinner = () => {
  const isLoading = useSelector((state) => state.loading.isLoading);

  if (!isLoading) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.spinnerWrapper}>
        <div style={styles.spinner} />
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  spinnerWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "5px solid rgba(255,255,255,0.3)",
    borderTop: "5px solid #ffffff",
    borderRadius: "50%",
    animation: "tct-spin 0.8s linear infinite",
  },
};

// Inject keyframes once into the document head
if (typeof document !== "undefined") {
  const styleId = "tct-spinner-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@keyframes tct-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

export default GlobalSpinner;
