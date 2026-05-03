"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "jakbarber-runtime-reload";
const GLOBAL_ERROR_RELOAD_FLAG = "jakbarber-global-error-reload-v2";

function getErrorMessage(event: ErrorEvent | PromiseRejectionEvent) {
  if ("reason" in event) {
    const reason = event.reason;
    if (reason instanceof Error) return `${reason.name} ${reason.message}`;
    return String(reason || "");
  }

  return `${event.message || ""} ${event.error?.message || ""}`;
}

function isRecoverableChunkError(message: string) {
  return /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    message
  );
}

function reportRuntimeError(message: string) {
  const payload = JSON.stringify({
    source: "runtime-guard",
    path: window.location.href,
    message,
    userAgent: window.navigator.userAgent,
  });

  try {
    if (window.navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      window.navigator.sendBeacon("/api/client-errors", blob);
      return;
    }
  } catch {
    // Fall back to fetch below.
  }

  fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function ClientRuntimeGuard() {
  useEffect(() => {
    const clearReloadFlag = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(RELOAD_FLAG);
        window.sessionStorage.removeItem(GLOBAL_ERROR_RELOAD_FLAG);
      } catch {
        // Storage can be unavailable in some private mobile sessions.
      }
    }, 10000);

    function recoverFromStaleRuntime(event: ErrorEvent | PromiseRejectionEvent) {
      const message = getErrorMessage(event);
      if (!isRecoverableChunkError(message)) return;
      reportRuntimeError(message);

      try {
        if (window.sessionStorage.getItem(RELOAD_FLAG) === "1") return;
        window.sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        // If sessionStorage is blocked, a single reload is still better than a dead screen.
      }

      window.location.reload();
    }

    window.addEventListener("error", recoverFromStaleRuntime);
    window.addEventListener("unhandledrejection", recoverFromStaleRuntime);

    return () => {
      window.clearTimeout(clearReloadFlag);
      window.removeEventListener("error", recoverFromStaleRuntime);
      window.removeEventListener("unhandledrejection", recoverFromStaleRuntime);
    };
  }, []);

  return null;
}
