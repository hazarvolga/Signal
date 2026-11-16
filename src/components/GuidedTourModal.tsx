import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, X, Check, Compass } from "lucide-react";
import { useTour } from "../contexts/TourContext";
import { useLanguage } from "../contexts/LanguageContext";

export const GuidedTourModal: React.FC = () => {
  const { isTourActive, currentStepIndex, currentStep, totalSteps, nextStep, prevStep, endTour } = useTour();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically navigate to relevant page when step changes during tour
  useEffect(() => {
    if (isTourActive && currentStep && currentStep.route !== location.pathname) {
      navigate(currentStep.route);
    }
  }, [isTourActive, currentStep, location.pathname, navigate]);

  if (!isTourActive) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-[100] max-w-md w-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="bg-[#0b0f19] border-2 border-burgundy/60 rounded-2xl p-6 shadow-2xl shadow-burgundy/20 text-white relative overflow-hidden backdrop-blur-md"
        >
          {/* TOP GLOW DECORATION */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-burgundy/30 rounded-full blur-2xl pointer-events-none" />

          {/* HEADER */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-burgundy/20 border border-burgundy/40 text-burgundy">
                <Compass size={16} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                {t("tour.guidedTour")} · {t("tour.step")} {currentStepIndex + 1} {t("tour.of")} {totalSteps}
              </span>
            </div>

            <button
              onClick={endTour}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
              title="Close Tour"
            >
              <X size={18} />
            </button>
          </div>

          {/* PROGRESS BAR */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mb-4 overflow-hidden">
            <div
              className="bg-burgundy h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* CONTENT */}
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {currentStep.title}
            </h3>
            <p className="text-xs font-semibold text-gray-300 italic">
              {currentStep.subtitle}
            </p>
            <p className="text-xs text-gray-300 leading-relaxed pt-1">
              {currentStep.description}
            </p>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              onClick={endTour}
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {t("tour.skip")}
            </button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1 border border-white/10"
                >
                  <ChevronLeft size={14} />
                  <span>{t("tour.back")}</span>
                </button>
              )}

              <button
                onClick={nextStep}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-burgundy hover:bg-burgundy/80 transition-all flex items-center gap-1 shadow-lg shadow-burgundy/30"
              >
                <span>{isLastStep ? t("tour.finish") : t("tour.next")}</span>
                {isLastStep ? <Check size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
