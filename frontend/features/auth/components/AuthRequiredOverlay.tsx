"use client";

import { Icon } from "@/shared/components/ui/Icon";
import styles from "./AuthRequiredOverlay.module.css";

interface AuthRequiredOverlayProps {
  onOpenProfile: () => void;
}

export default function AuthRequiredOverlay({
  onOpenProfile,
}: AuthRequiredOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <Icon name="lock" />
        </div>
        <h2>Log In Required</h2>
        <p>Please sign in to use the solar panel design application</p>
        <button className={styles.signInButton} onClick={onOpenProfile}>
          <Icon name="login" />
          Sign In
        </button>
      </div>
    </div>
  );
}
