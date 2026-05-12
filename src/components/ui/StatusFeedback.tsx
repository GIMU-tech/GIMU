import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StatusFeedbackProps {
  status: 'idle' | 'loading' | 'error' | 'success';
  message?: string;
}

/**
 * [Minimal Pulse] 디자인 명세 기반 피드백 컴포넌트
 * - loading: 은은한 opacity와 scale의 호흡
 * - error: 빠른 shake와 red glow
 * - success: 부드러운 expand와 green glow
 */
export const StatusFeedback: React.FC<StatusFeedbackProps> = ({ status, message }) => {
  // 1. Loading Variants
  const loadingVariants = {
    initial: { opacity: 0.4, scale: 0.95 },
    animate: {
      opacity: [0.4, 0.8, 0.4],
난이도: [0.95, 1.05, 0.95],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // 2. Error Variants
  const errorVariants = {
    initial: { x: 0 },
    animate: {
      x: [-2, 2, -2, 2, 0],
      transition: { duration: 0.4, ease: "linear" },
    },
  };

  // 3. Success Variants
  const successVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  };

  return (
    <div className="relative flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial="initial"
            animate="animate"
            exit="unmount"
            variants={loadingVariants}
            className="flex items-center gap-2 text-gray-400"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-medium">Thinking...</span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial="initial"
            animate="animate"
            exit="unmount"
            variants={errorVariants}
            className="flex items-center gap-2 text-red-500"
          >
            <span className="text-sm font-bold">! {message || 'Something went wrong'}</span>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial="initial"
            animate="animate"
            exit="unmount"
            variants={successVariants}
            className="flex items-center gap-2 text-green-500"
          >
            <span className="text-sm font-medium">✓ {message || 'Done'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};