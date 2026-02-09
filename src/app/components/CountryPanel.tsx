'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountryFlag } from './CountryFlag';
import type { CountryData } from '../lib/aggregate-data';

interface CountryPanelProps {
  country: CountryData | null;
  onClose: () => void;
}

const INITIAL_CRIMES = 10;
const LOAD_MORE_COUNT = 5;

export const CountryPanel = ({ country, onClose }: CountryPanelProps) => {
  const [visibleCrimes, setVisibleCrimes] = useState(INITIAL_CRIMES);

  // Reset visible crimes when country changes
  useEffect(() => {
    setVisibleCrimes(INITIAL_CRIMES);
  }, [country?.countryCode]);

  if (!country) {
    return (
      <div className="flex h-full w-80 flex-col items-center justify-center border-l border-border/50 bg-card/50 p-6 text-center backdrop-blur-sm">
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Select a Country
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Click on any country on the map to view detailed deportation data and
          crime breakdown.
        </p>
      </div>
    );
  }

  const displayedCrimes = country.crimes.slice(0, visibleCrimes);
  const remainingCrimes = country.crimes.length - visibleCrimes;
  const totalCrimeInstances = country.crimes.reduce(
    (sum, c) => sum + c.count,
    0
  );

  const handleLoadMore = () => {
    setVisibleCrimes((prev) => prev + LOAD_MORE_COUNT);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex h-full w-80 flex-col border-l border-border/50 bg-card/50 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CountryFlag
              countryCode={country.countryCode}
              size={40}
              className="shadow-lg shadow-black/20"
            />
          </motion.div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {country.country}
            </motion.h2>
            <p className="font-mono text-xs text-muted-foreground">
              {country.countryCode}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close panel"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onClose()}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Stats */}
      <div className="border-b border-border/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-baseline gap-2"
        >
          <span className="font-mono text-4xl font-bold tabular-nums tracking-tighter text-foreground">
            {country.count.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">deportees</span>
        </motion.div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {totalCrimeInstances.toLocaleString()}
          </span>{' '}
          total crime instances
        </p>
      </div>

      {/* Crimes List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Top Crimes
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {displayedCrimes.length}/{country.crimes.length}
          </span>
        </div>

        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {displayedCrimes.map((crime, idx) => (
              <motion.div
                key={`${crime.crime}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.02, duration: 0.2 }}
                whileHover={{ scale: 1.01, backgroundColor: 'hsl(var(--accent))' }}
                className="group flex items-start justify-between gap-3 rounded-lg border border-transparent bg-muted/30 p-2.5 transition-colors hover:border-border/50"
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="text-sm leading-tight text-foreground/90 group-hover:text-foreground">
                    {crime.crime}
                  </span>
                </div>
                <span className="flex-shrink-0 font-mono text-xs font-medium tabular-nums text-muted-foreground">
                  {crime.count.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Load More Button */}
        {remainingCrimes > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3" />
              <span>
                +{Math.min(remainingCrimes, LOAD_MORE_COUNT)} more crime types
              </span>
              <span className="font-mono text-muted-foreground/60">
                ({remainingCrimes} left)
              </span>
            </Button>
          </motion.div>
        )}

        {remainingCrimes <= 0 && country.crimes.length > INITIAL_CRIMES && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-xs text-muted-foreground/60"
          >
            All crimes loaded
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};
