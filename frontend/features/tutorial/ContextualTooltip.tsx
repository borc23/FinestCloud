'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from '@/contexts/TutorialContext';
import styles from './ContextualTooltip.module.css';

export function ContextualTooltip() {
  const { activeTooltip, hideTooltip, skipTutorial, nextStep } = useTutorial();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!activeTooltip || !activeTooltip.targetElement) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(activeTooltip.targetElement!);
      if (!targetElement || !tooltipRef.current) return;

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const preferredPosition = activeTooltip.position || 'bottom';

      let top = 0;
      let left = 0;
      let finalArrowPosition: 'top' | 'bottom' | 'left' | 'right' = preferredPosition;

      switch (preferredPosition) {
        case 'bottom':
          top = targetRect.bottom + 12; // 12px gap
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          finalArrowPosition = 'top';
          break;

        case 'top':
          top = targetRect.top - tooltipRect.height - 12;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          finalArrowPosition = 'bottom';
          break;

        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + 12;
          finalArrowPosition = 'left';
          break;

        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - 12;
          finalArrowPosition = 'right';
          break;
      }

      // Keep tooltip within viewport bounds
      const padding = 16;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setPosition({ top, left });
      setArrowPosition(finalArrowPosition);
    };

    // Initial position calculation
    setTimeout(updatePosition, 50);

    // Recalculate on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeTooltip]);

  const handleDismiss = () => {
    hideTooltip();
  };

  const handleSkip = () => {
    skipTutorial();
  };

  const handleNext = () => {
    nextStep();
  };

  if (!mounted || !activeTooltip) return null;

  return createPortal(
    <AnimatePresence>
      {activeTooltip && (
        <>
          {/* Subtle backdrop overlay */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[arrowPosition]}`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* Close button */}
            <button
              className={styles.closeButton}
              onClick={handleDismiss}
              aria-label="Dismiss tooltip"
            >
              ×
            </button>

            {/* Content */}
            <div className={styles.content}>
              {activeTooltip.content}
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              {activeTooltip.showSkip && (
                <button
                  className={styles.skipButton}
                  onClick={handleSkip}
                >
                  Skip Tutorial
                </button>
              )}

              {activeTooltip.showNext && (
                <button
                  className={styles.nextButton}
                  onClick={handleNext}
                >
                  Next
                </button>
              )}

              {!activeTooltip.showNext && !activeTooltip.showSkip && (
                <button
                  className={styles.gotItButton}
                  onClick={handleDismiss}
                >
                  Got it
                </button>
              )}
            </div>

            {/* Arrow */}
            <div className={styles.arrow} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
