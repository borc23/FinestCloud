'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface TooltipConfig {
  id: string;
  targetElement?: string; // CSS selector or element ID
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showNext?: boolean;
  showSkip?: boolean;
  onNext?: () => void;
  onSkip?: () => void;
}

interface TutorialState {
  tutorialActive: boolean;
  currentStep: number;
  completedSteps: string[];
  hasSeenTooltips: Record<string, boolean>;
  tutorialCompleted: boolean;
}

interface TutorialContextValue {
  tutorialState: TutorialState;
  activeTooltip: TooltipConfig | null;
  showTooltip: (config: TooltipConfig) => void;
  hideTooltip: () => void;
  markStepComplete: (stepId: string) => void;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  hasSeenTooltip: (id: string) => boolean;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

const STORAGE_KEY = 'finestcloud_tutorial_state';

// Tutorial step sequence for first-time users
const TUTORIAL_STEPS = [
  'welcome',
  'search_location',
  'capture_roof',
  'generate_panels',
  'view_results',
  'tutorial_complete'
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    tutorialActive: false,
    currentStep: 0,
    completedSteps: [],
    hasSeenTooltips: {},
    tutorialCompleted: false,
  });
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(null);

  // Load tutorial state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTutorialState(parsed);
      } catch (error) {
        console.error('Failed to parse tutorial state:', error);
      }
    }
  }, []);

  // Save tutorial state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialState));
  }, [tutorialState]);

  // Initialize tutorial for first-time authenticated users
  useEffect(() => {
    if (user && !tutorialState.tutorialCompleted) {
      // Check if this is the first time the user has logged in
      const hasSeenWelcome = tutorialState.hasSeenTooltips['welcome'];

      if (!hasSeenWelcome) {
        // Start tutorial after a 2-second delay
        const timer = setTimeout(() => {
          setTutorialState(prev => ({
            ...prev,
            tutorialActive: true,
            hasSeenTooltips: {
              ...prev.hasSeenTooltips,
              welcome: true,
            },
          }));

          // Show welcome tooltip by setting activeTooltip directly
          setActiveTooltip({
            id: 'welcome',
            targetElement: '#search-button',
            content: 'Welcome! Start by searching for the property you want to analyze.',
            position: 'bottom',
            showNext: true,
            showSkip: true,
          });
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [user, tutorialState.tutorialCompleted, tutorialState.hasSeenTooltips]);

  const showTooltip = useCallback((config: TooltipConfig) => {
    // Don't show if tutorial is completed and this is an auto-tooltip
    if (tutorialState.tutorialCompleted && !config.id.startsWith('manual_')) {
      return;
    }

    // Don't show if already seen (unless it's a manual "show me" replay)
    if (tutorialState.hasSeenTooltips[config.id] && !config.id.startsWith('manual_')) {
      return;
    }

    setActiveTooltip(config);

    // Mark as seen
    setTutorialState(prev => ({
      ...prev,
      hasSeenTooltips: {
        ...prev.hasSeenTooltips,
        [config.id]: true,
      },
    }));

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setActiveTooltip(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [tutorialState.tutorialCompleted, tutorialState.hasSeenTooltips]);

  const hideTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const markStepComplete = useCallback((stepId: string) => {
    setTutorialState(prev => {
      const completedSteps = [...prev.completedSteps];
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
      }

      // Advance to next step if this is part of the main tutorial flow
      const stepIndex = TUTORIAL_STEPS.indexOf(stepId);
      const currentStep = stepIndex >= 0 ? stepIndex + 1 : prev.currentStep;

      // Check if tutorial is complete
      const tutorialCompleted = stepId === 'tutorial_complete' ||
                                currentStep >= TUTORIAL_STEPS.length;

      return {
        ...prev,
        completedSteps,
        currentStep,
        tutorialCompleted,
        tutorialActive: !tutorialCompleted,
      };
    });
  }, []);

  const startTutorial = useCallback(() => {
    // Reset tutorial state and start from beginning
    setTutorialState({
      tutorialActive: true,
      currentStep: 0,
      completedSteps: [],
      hasSeenTooltips: { manual_welcome: true },
      tutorialCompleted: false,
    });

    // Show welcome tooltip
    setTimeout(() => {
      setActiveTooltip({
        id: 'manual_welcome',
        targetElement: '#search-button',
        content: 'Welcome! Start by searching for the property you want to analyze.',
        position: 'bottom',
        showNext: true,
        showSkip: true,
      });
    }, 300);
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      tutorialActive: false,
      tutorialCompleted: true,
    }));
    setActiveTooltip(null);
  }, []);

  const nextStep = useCallback(() => {
    hideTooltip();

    // If there's an onNext callback, execute it
    if (activeTooltip?.onNext) {
      activeTooltip.onNext();
    }
  }, [activeTooltip, hideTooltip]);

  const hasSeenTooltip = useCallback((id: string) => {
    return tutorialState.hasSeenTooltips[id] === true;
  }, [tutorialState.hasSeenTooltips]);

  const value: TutorialContextValue = {
    tutorialState,
    activeTooltip,
    showTooltip,
    hideTooltip,
    markStepComplete,
    startTutorial,
    skipTutorial,
    nextStep,
    hasSeenTooltip,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

// Hook for individual tooltips - checks if should show based on tutorial state
export function useTooltip(id: string) {
  const { tutorialState, showTooltip, hasSeenTooltip } = useTutorial();

  const shouldShow = !tutorialState.tutorialCompleted && !hasSeenTooltip(id);

  return {
    shouldShow,
    showTooltip,
  };
}
