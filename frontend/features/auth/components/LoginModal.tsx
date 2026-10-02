"use client";

import { useState } from "react";
import { signIn } from "@/features/auth/lib/authApi";
import { createClient } from "@/shared/lib/supabase/client";
import { Icon } from "@/shared/components/ui/Icon";
import styles from "./AuthModal.module.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSwitchToSignUp,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      onClose();
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Sign In</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon name="times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className={styles.footer}>
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className={styles.linkButton}
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
