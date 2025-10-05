import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingBarProps {
  isLoading: boolean;
  duration?: number; // seconds for one full sweep
}

const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, duration = 2 }) => {
  const [shouldShow, setShouldShow] = useState(isLoading);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFinishing(false);
      setShouldShow(true);
    } else {
      // Let one more animation cycle finish before hiding
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
            transition: { duration: 0.6, ease: "easeInOut" },
          }}
          className="fixed top-0 left-0 right-0 z-50 h-[6px] md:h-[8px]"
        >
          <div className="relative h-full w-full overflow-hidden bg-gray-900/10 backdrop-blur-[1px]">
            {/* Main animated gradient bar */}
            <motion.div
              key={isLoading ? "loop" : "finish"}
              className="absolute top-0 left-0 h-full w-full"
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
                  "linear-gradient(90deg, rgba(230,168,92,0.4) 0%, rgba(232,90,155,0.9) 50%, rgba(217,70,239,0.4) 100%)",
                boxShadow:
                  "0 0 8px rgba(232,90,155,0.6), 0 0 12px rgba(217,70,239,0.3)",
                borderRadius: "2px",
              }}
            />

            {/* Gloss / sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer mix-blend-screen" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingBar;
