'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface HeaderProps {
  total: number;
}

export const Header = ({ total }: HeaderProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-9 w-9 overflow-hidden rounded-lg shadow-lg shadow-black/20"
        >
          <Image
            src="/logo.png"
            alt="DHS Data Logo"
            width={36}
            height={36}
            className="object-cover"
            priority
          />
        </motion.div>
        <div>
          <h1 className="text-base font-medium tracking-tight text-foreground">
            DHS Deportation Data
          </h1>
          <p className="text-xs text-muted-foreground">
            Interactive visualization by country of origin
          </p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5"
      >
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {total.toLocaleString()}
        </span>
      </motion.div>
    </motion.header>
  );
};
