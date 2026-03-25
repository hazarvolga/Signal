import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TourContextType {
  isTourActive: boolean;
  setIsTourActive: (active: boolean) => void;
  toggleTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isTourActive, setIsTourActive] = useState(false);

  const toggleTour = () => setIsTourActive(prev => !prev);

  return (
    <TourContext.Provider value={{ isTourActive, setIsTourActive, toggleTour }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
