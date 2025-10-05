import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingBarProps {
  isLoading: boolean;
  duration?: number;
}

const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, duration = 2 }) => {
  const [shouldShow, setShouldShow] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShouldShow(true);
    } else {
      const timer = setTimeout(() => setShouldShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed top-0 left-0 right-0 z-50 h-1"
        >
          <div className="relative h-full w-full bg-gray-100 overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF]"
              initial={{ x: '-100%' }}
              animate={{
                x: isLoading ? ['100%', '100%'] : '0%',
                transition: {
                  repeat: isLoading ? Infinity : 0,
                  duration: duration,
                  ease: 'linear',
                }
              }}
              style={{
                backgroundSize: '200% 100%',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingBar;
