import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingBarProps {
  isLoading: boolean;
  duration?: number; // seconds per full sweep
}

const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, duration = 1.2 }) => {
  const [shouldShow, setShouldShow] = useState(isLoading);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setFinishing(false);
      setShouldShow(true);
    } else {
      // allow one final loop before fade
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
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
          className="fixed top-0 left-0 right-0 z-50 h-[6px] md:h-[8px]"
        >
          <div className="relative h-full w-full overflow-hidden bg-gray-900/10">
            {/* vibrant main gradient that keeps moving */}
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
                  "linear-gradient(90deg, #E6A85C 0%, #E85A9B 50%, #C874EC 100%)",
                backgroundSize: "200% 100%",
                filter: "brightness(1.2) saturate(1.2)",
              }}
            />

            {/* bright shimmer band revealing effect */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] animate-shimmer" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingBar;
