"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 5000;
const GIVE_UP_AFTER_MS = 3 * 60 * 1000;
const TOAST_ID = "backend-warmup";

/**
 * Wake the analysis backend as soon as the page loads. Free hosting tiers
 * sleep when idle and the first request then waits for the server (and the
 * YOLO model) to start, so a visitor would otherwise hit a long stall on
 * their first detection. A toast explains the wait only if there is one.
 */
export function useBackendWarmup() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const check = async () => {
      let ready = false;
      try {
        const response = await fetch("/api/warmup", { cache: "no-store" });
        ready = response.ok && (await response.json()).ready === true;
      } catch {
        // Network hiccup: treat as not ready and retry
      }
      if (cancelled) return;

      if (ready) {
        // Only announce readiness if the visitor was told to wait
        if (Date.now() - startedAt > POLL_INTERVAL_MS) {
          toast.success("Analysis server is ready", { id: TOAST_ID });
        }
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        toast.error("The analysis server is not responding", { id: TOAST_ID });
        return;
      }
      toast.loading("Waking up the analysis server, this can take a minute…", {
        id: TOAST_ID,
      });
      timer = setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      toast.dismiss(TOAST_ID);
    };
  }, []);
}
