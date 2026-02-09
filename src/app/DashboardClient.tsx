'use client';

import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { WorldMap } from './components/WorldMap';
import { CountryPanel } from './components/CountryPanel';
import { Legend } from './components/Legend';
import type { AggregatedData } from './lib/aggregate-data';

interface DashboardClientProps {
  data: AggregatedData;
}

export const DashboardClient = ({ data }: DashboardClientProps) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null
  );

  const selectedCountry = useMemo(() => {
    if (!selectedCountryCode) return null;
    return data.byIsoCode[selectedCountryCode] || null;
  }, [selectedCountryCode, data.byIsoCode]);

  const maxCount = useMemo(() => {
    return Math.max(...data.countries.map((c) => c.count));
  }, [data.countries]);

  const handleSelectCountry = (isoCode: string | null) => {
    setSelectedCountryCode(isoCode);
  };

  const handleClosePanel = () => {
    setSelectedCountryCode(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header total={data.total} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-muted/30">
          <WorldMap
            data={data.byIsoCode}
            selectedCountry={selectedCountryCode}
            onSelectCountry={handleSelectCountry}
            maxCount={maxCount}
          />
        </div>

        <CountryPanel country={selectedCountry} onClose={handleClosePanel} />
      </div>

      <Legend />
    </div>
  );
};
