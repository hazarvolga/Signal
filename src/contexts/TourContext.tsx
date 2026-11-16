import React, { createContext, useContext, useState, ReactNode } from "react";
import { useLanguage } from "./LanguageContext";

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  guideKey?: string;
}

const STEP_ROUTES: Record<string, string> = {
  dashboard: "/",
  campaigns: "/campaigns",
  byo_keys: "/",
  validation: "/validation",
  automations: "/automations",
  reports: "/reports",
};

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  setIsTourActive: (active: boolean) => void;
  toggleTour: () => void;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const { currentTranslations } = useLanguage();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const rawSteps = currentTranslations.tour?.steps || [];
  const tourSteps: TourStep[] = rawSteps.map((step: any) => ({
    ...step,
    route: STEP_ROUTES[step.id] || "/",
  }));

  const startTour = () => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
  };

  const endTour = () => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
  };

  const toggleTour = () => {
    if (isTourActive) {
      endTour();
    } else {
      startTour();
    }
  };

  const nextStep = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const currentStep = tourSteps[currentStepIndex] || {
    id: "dashboard",
    title: "📊 SIGNAL Dashboard",
    subtitle: "Analytics",
    description: "Welcome to SIGNAL",
    route: "/",
  };

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        currentStep,
        totalSteps: tourSteps.length,
        setIsTourActive,
        toggleTour,
        startTour,
        nextStep,
        prevStep,
        endTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};
