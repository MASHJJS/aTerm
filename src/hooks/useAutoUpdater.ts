import { useState, useEffect, useCallback, useRef } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateState {
  available: boolean;
  version: string;
  body: string;
  downloading: boolean;
  progress: number;
  error: string | null;
}

const INITIAL_STATE: UpdateState = {
  available: false,
  version: "",
  body: "",
  downloading: false,
  progress: 0,
  error: null,
};

export function useAutoUpdater() {
  const [state, setState] = useState<UpdateState>(INITIAL_STATE);
  const updateRef = useRef<Update | null>(null);

  useEffect(() => {
    // Delay check by 3 seconds to not block startup
    const timeout = setTimeout(async () => {
      try {
        const update = await check();
        if (update) {
          updateRef.current = update;
          setState((prev) => ({
            ...prev,
            available: true,
            version: update.version,
            body: update.body || "",
          }));
        }
      } catch (e) {
        // Silently fail - update check is non-critical
        console.warn("Update check failed:", e);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState((prev) => ({ ...prev, downloading: true, error: null }));

    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const progress =
            totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          setState((prev) => ({ ...prev, progress }));
        }
      });

      await relaunch();
    } catch (e) {
      setState((prev) => ({
        ...prev,
        downloading: false,
        error: e instanceof Error ? e.message : "Update failed",
      }));
    }
  }, []);

  const dismiss = useCallback(() => {
    setState(INITIAL_STATE);
    updateRef.current = null;
  }, []);

  return { ...state, install, dismiss };
}
