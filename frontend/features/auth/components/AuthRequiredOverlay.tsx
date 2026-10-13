"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/shared/components/ui/Icon";
import { createClient } from "@/shared/lib/supabase/client";
import styles from "./AuthRequiredOverlay.module.css";

// Needs "Allow anonymous sign-ins" enabled in Supabase Auth
const GUEST_DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GUEST_DEMO === "true";

interface AuthRequiredOverlayProps {
  onOpenProfile: () => void;
}

export default function AuthRequiredOverlay({
  onOpenProfile,
}: AuthRequiredOverlayProps) {
  const [startingDemo, setStartingDemo] = useState(false);

  // A guest is a real (anonymous) Supabase user, so RLS and the daily API
  // quota apply exactly as for accounts; AuthContext picks up the session
  const handleTryDemo = async () => {
    setStartingDemo(true);
    const { error } = await createClient().auth.signInAnonymously();
    if (error) {
      console.error("Guest sign-in failed:", error);
      toast.error("The demo is unavailable right now. Please sign in instead.");
      setStartingDemo(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <Icon name="lock" />
        </div>
        <h2>Log In Required</h2>
        <p>Please sign in to use the solar panel design application</p>
        <div className={styles.actions}>
          <button className={styles.signInButton} onClick={onOpenProfile}>
            <Icon name="login" />
            Sign In
          </button>
          {GUEST_DEMO_ENABLED && (
            <button
              className={styles.demoButton}
              onClick={handleTryDemo}
              disabled={startingDemo}
            >
              <Icon name={startingDemo ? "spinner" : "solar-panel"} />
              Try the demo, no sign-up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
