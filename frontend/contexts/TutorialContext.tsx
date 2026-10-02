"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getProfile, setShowTutorial } from "@/features/auth/lib/profilesApi";

interface TooltipConfig {
  id: string;
  targetElement?: string; // CSS selector or element ID
  content: string;
  position?: "top" | "bottom" | "left" | "right";
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

const TutorialContext = createContext<TutorialContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "finestcloud_tutorial_state";

// Tutorial step sequence for first-time users
const TUTORIAL_STEPS = [
  "welcome",
  "search_location",
  "capture_roof",
  "edit_mode",
  "generate_panels",
  "view_results",
  "tutorial_complete",
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
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(
    null,
  );
  const [dbShowTutorial, setDbShowTutorial] = useState<boolean | null>(null);

  // Load tutorial state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTutorialState(parsed);
      } catch (error) {
        console.error("Failed to parse tutorial state:", error);
      }
    }
  }, []);

  // Save tutorial state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorialState));
  }, [tutorialState]);

  // Load show_tutorial flag from database
  useEffect(() => {
    if (user) {
      getProfile(user.id).then((profile) => {
        if (profile) {
          setDbShowTutorial(profile.show_tutorial);
        }
      });
    } else {
      setDbShowTutorial(null);
    }
  }, [user]);

  // Initialize tutorial for first-time authenticated users
  // DISABLED: Tutorial feature is currently turned off
  useEffect(() => {
    // Tutorial is disabled globally - do nothing
    return;
  }, [
    user,
    dbShowTutorial,
    tutorialState.tutorialCompleted,
    tutorialState.hasSeenTooltips,
  ]);

  const showTooltip = useCallback(
    (config: TooltipConfig) => {
      // DISABLED: Tutorial feature is globally disabled
      return;
    },
    [
      dbShowTutorial,
      tutorialState.tutorialCompleted,
      tutorialState.hasSeenTooltips,
    ],
  );

  const hideTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const markStepComplete = useCallback(
    async (stepId: string) => {
      setTutorialState((prev) => {
        const completedSteps = [...prev.completedSteps];
        if (!completedSteps.includes(stepId)) {
          completedSteps.push(stepId);
        }

        // Advance to next step if this is part of the main tutorial flow
        const stepIndex = TUTORIAL_STEPS.indexOf(stepId);
        const currentStep = stepIndex >= 0 ? stepIndex + 1 : prev.currentStep;

        // Check if tutorial is complete
        const tutorialCompleted =
          stepId === "tutorial_complete" ||
          currentStep >= TUTORIAL_STEPS.length;

        // Update database flag when tutorial is completed
        if (tutorialCompleted && user) {
          setShowTutorial(user.id, false)
            .then(() => {
              setDbShowTutorial(false);
            })
            .catch((error) => {
              console.error("Failed to update tutorial preference:", error);
            });
        }

        return {
          ...prev,
          completedSteps,
          currentStep,
          tutorialCompleted,
          tutorialActive: !tutorialCompleted,
        };
      });
    },
    [user],
  );

  const startTutorial = useCallback(async () => {
    // Reset tutorial state and start from beginning
    setTutorialState({
      tutorialActive: true,
      currentStep: 0,
      completedSteps: [],
      hasSeenTooltips: { manual_welcome: true },
      tutorialCompleted: false,
    });

    // Update database flag to true
    if (user) {
      try {
        await setShowTutorial(user.id, true);
        setDbShowTutorial(true);
      } catch (error) {
        console.error("Failed to update tutorial preference:", error);
      }
    }

    // Show welcome tooltip
    setTimeout(() => {
      setActiveTooltip({
        id: "manual_welcome",
        targetElement: "#search-button",
        content:
          "Welcome! Start by searching for the property you want to analyze.",
        position: "bottom",
        showNext: true,
        showSkip: true,
      });
    }, 300);
  }, [user]);

  const skipTutorial = useCallback(async () => {
    setTutorialState((prev) => ({
      ...prev,
      tutorialActive: false,
      tutorialCompleted: true,
    }));
    setActiveTooltip(null);

    // Update database flag to false
    if (user) {
      try {
        await setShowTutorial(user.id, false);
        setDbShowTutorial(false);
      } catch (error) {
        console.error("Failed to update tutorial preference:", error);
      }
    }
  }, [user]);

  const nextStep = useCallback(() => {
    hideTooltip();

    // If there's an onNext callback, execute it
    if (activeTooltip?.onNext) {
      activeTooltip.onNext();
    }
  }, [activeTooltip, hideTooltip]);

  const hasSeenTooltip = useCallback(
    (id: string) => {
      return tutorialState.hasSeenTooltips[id] === true;
    },
    [tutorialState.hasSeenTooltips],
  );

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
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
