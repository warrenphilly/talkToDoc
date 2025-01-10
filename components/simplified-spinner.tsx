"use client"

import { motion } from 'framer-motion'

export default function SimplifiedSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <motion.svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        initial="hidden"
        animate="visible"
      >
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          stroke="#94b347"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          variants={{
            hidden: { pathLength: 0 },
            visible: {
              pathLength: 1,
              transition: {
                duration: 1.5,
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

