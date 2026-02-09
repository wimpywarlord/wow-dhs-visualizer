'use client';

import { motion } from 'framer-motion';

// Dark mode optimized color palette - cyan/teal gradient
const legendBuckets = [
  { label: 'No data', color: '#1a1a1a' },
  { label: '1-10', color: '#164e63' },
  { label: '11-100', color: '#0e7490' },
  { label: '101-500', color: '#06b6d4' },
  { label: '501-1K', color: '#22d3ee' },
  { label: '1K+', color: '#67e8f9' },
];

export const Legend = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-center gap-4 border-t border-border/50 bg-background/80 px-6 py-3 backdrop-blur-sm"
    >
      <span className="text-xs font-medium text-muted-foreground">
        Deportees
      </span>
      <div className="flex items-center gap-1">
        {legendBuckets.map((bucket, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="group flex cursor-default items-center"
          >
            <div
              className="h-3 w-6 rounded-sm ring-1 ring-white/10 transition-transform group-hover:scale-110"
              style={{ backgroundColor: bucket.color }}
            />
            <span className="ml-1.5 mr-3 font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
              {bucket.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
