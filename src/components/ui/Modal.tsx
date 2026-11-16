import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = "max-w-2xl" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Dialog"}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`relative ${width} w-full mx-4 bg-surface border-2 border-burgundy max-h-[80vh] overflow-y-auto`}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-burgundy/20">
                <h2 id={titleId} className="text-xl font-editorial">
                  {title}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close dialog"
                  onClick={onClose}
                  className="p-2 hover:bg-ink/5"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className={title ? "p-6" : "p-6 pt-12"}>
              {!title && (
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close dialog"
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-ink/5"
                >
                  <X size={18} />
                </button>
              )}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
