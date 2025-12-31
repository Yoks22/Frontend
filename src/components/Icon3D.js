// src/components/Icon3D.js
import React from "react";

/**
 * Simple wrapper that produces the 3D-like box used by other components.
 * Children typically are single-character or SVG.
 */
export default function Icon3D({ children, size = 60, active = false }) {
  return (
    <div className={`icon-3d ${active ? "active" : ""}`} style={{ width: size, height: size }}>
      <div className="icon-face">{children}</div>
      <div className="icon-shadow" />
    </div>
  );
}
