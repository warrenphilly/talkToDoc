"use client"

import { motion } from 'framer-motion'

export default function ContinuousSegmentSpinner() {
  return (
    <div className="flex items-center justify-center h-fit">
      <motion.svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        initial="hidden"
        animate="visible"
      >
        {/* Light grey background circle */}
        <circle
          cx="30"
          cy="30"
          r="25"
          stroke="#E5E5E5"
          strokeWidth="5"
          fill="none"
        />
        {/* Spinning primary color segment */}
        <motion.circle
          cx="30"
          cy="30"
          r="25"
          stroke="#94b347"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="39.25 117.75"
          variants={{
            hidden: { rotate: 0 },
            visible: {
              rotate: 360,
              transition: {
                duration: 0.3,
                repeat: Infinity,
                ease: "linear"
              }
            }
          }}
        />
      </motion.svg>
    </div>
  )
}

