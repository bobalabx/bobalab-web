"use client";
/**
 * Footer "Reduce motion" switch (brief §D1, §E7; decision H-14).
 * Writes localStorage "bobalab-motion" and <html data-motion="reduce">.
 * Server render and hydration use the "off" snapshot; the real state follows
 * immediately after hydration (useSyncExternalStore), so there is no mismatch.
 */
import { useSyncExternalStore } from "react";
import {
  readStoredMotion,
  setMotionPreference,
  subscribeMotion,
  systemPrefersReducedMotion,
} from "@/lib/site/motion";

const snapshot = () => `${readStoredMotion()}|${systemPrefersReducedMotion() ? 1 : 0}`;
const serverSnapshot = () => "auto|0";

export function MotionToggle() {
  const state = useSyncExternalStore(subscribeMotion, snapshot, serverSnapshot);
  const [stored, os] = state.split("|");
  const on = stored === "reduce";
  const viaSystem = os === "1" && !on;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="bl-switch"
      onClick={() => setMotionPreference(!on)}
    >
      <span className="bl-switch__track" aria-hidden="true">
        <span className="bl-switch__thumb" />
      </span>
      <span>
        Reduce motion
        {viaSystem && (
          <span className="bl-switch__note"> (already reduced by your system setting)</span>
        )}
      </span>
    </button>
  );
}
