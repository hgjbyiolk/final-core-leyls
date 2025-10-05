import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingBarProps {
  isLoading: boolean;
  duration?: number; // seconds per shimmer pass
}

const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, duration = 0.8 }) => {
  const [shouldShow, setShouldShow] = useState(isLoading);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFinishing(false);
      setShouldShow(true);
    } else {
      // Let one last shimmer complete before fading
      setFinishing(true);
      const timer = setTimeout(() => setShouldShow(false), duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, duration]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scaleY: 0.3,
            transition: { duration: 0.4, ease: "easeInOut" },
          }}
          className="fixed top-0 left-0 right-0 z-50 h-[8px] rounded-b-xl overflow-hidden"
        >
          <div className="relative h-full w-full bg-transparent">
            {/* Core gradient shimmer */}
            <motion.div
              key={isLoading ? "loop" : "finish"}
              className="absolute top-0 left-0 h-full w-full rounded-b-xl"
              initial={{ x: "-100%" }}
              animate={{
                x: finishing ? "0%" : ["-100%", "100%"],
              }}
              transition={{
                duration,
                ease: "linear",
                repeat: finishing ? 0 : Infinity,
              }}
              style={{
                background:
                  "linear-gradient(90deg, #FFB86C 0%, #FF61A6 35%, #9D5CFF 70%, #3AC5FF 100%)",
                filter: "brightness(1.3) saturate(1.4)",
                boxShadow: "0 0 20px rgba(157,92,255,0.6)",
              }}
            />

            {/* White gloss reveal */}
            <div className="absolute inset-0 rounded-b-xl bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.85),transparent)] animate-shimmer" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingBar;
