import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};
// Drawer component for displaying a side menu with an overlay, using framer-motion for animations and handling keyboard events for accessibility.
export const Drawer: React.FC<Props> = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* fade-in and fade-out background */}
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* drawer with ease-in and ease-out animation  */}
          <motion.div
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}      
            animate={{ x: 0 }}           
            exit={{ x: "100%" }}       
            transition={{ 
              type: "tween", 
              ease: "easeIn",          
              duration: 0.3 
            }}
          >
            <h3>{title}</h3>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};