'use client';

import { memo, useState, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { scaleThreshold } from 'd3-scale';
import { motion, AnimatePresence } from 'framer-motion';
import type { CountryData } from '../lib/aggregate-data';

// Using geo-countries GeoJSON which includes ISO3166-1-Alpha-3 codes
const geoUrl =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

interface WorldMapProps {
  data: Record<string, CountryData>;
  selectedCountry: string | null;
  onSelectCountry: (isoCode: string | null) => void;
  maxCount: number;
}

// Dark mode optimized color palette - cyan/teal gradient (matches Legend)
const colorBuckets = [1, 11, 101, 501, 1001];
const colorRange = [
  '#1a1a1a', // 0 (no data) - dark
  '#164e63', // 1-10 - cyan-900
  '#0e7490', // 11-100 - cyan-700
  '#06b6d4', // 101-500 - cyan-500
  '#22d3ee', // 501-1000 - cyan-400
  '#67e8f9', // 1000+ - cyan-300
];

// Create discrete color scale using thresholds
const colorScale = scaleThreshold<number, string>()
  .domain(colorBuckets)
  .range(colorRange);

export const getColorScale = (_maxCount: number) => (value: number) =>
  colorScale(value);

const WorldMapComponent = ({
  data,
  selectedCountry,
  onSelectCountry,
}: WorldMapProps) => {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleClick = useCallback(
    (geo: {
      properties: { 'ISO3166-1-Alpha-3': string; name: string };
    }) => {
      const isoCode = geo.properties['ISO3166-1-Alpha-3'];
      if (data[isoCode]) {
        onSelectCountry(isoCode === selectedCountry ? null : isoCode);
      }
    },
    [data, selectedCountry, onSelectCountry]
  );

  const handleMouseEnter = useCallback(
    (
      geo: { properties: { 'ISO3166-1-Alpha-3': string; name: string } },
      evt: React.MouseEvent
    ) => {
      const isoCode = geo.properties['ISO3166-1-Alpha-3'];
      const countryData = data[isoCode];
      const name = geo.properties.name;

      if (countryData) {
        setTooltipContent(
          `${name}: ${countryData.count.toLocaleString()}`
        );
      } else {
        setTooltipContent(name);
      }
      setTooltipPosition({ x: evt.clientX, y: evt.clientY });
    },
    [data]
  );

  const handleMouseMove = useCallback((evt: React.MouseEvent) => {
    setTooltipPosition({ x: evt.clientX, y: evt.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipContent('');
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0a0a0a]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
          center: [0, 30],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup minZoom={1} maxZoom={8}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isoCode = geo.properties['ISO3166-1-Alpha-3'] as string;
                const countryData = data[isoCode];
                const isSelected = isoCode === selectedCountry;
                const count = countryData?.count || 0;

                let fill = '#1a1a1a'; // Default: no data
                if (count > 0) {
                  fill = colorScale(count);
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleClick(geo)}
                    onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      default: {
                        fill: fill,
                        stroke: isSelected ? '#22d3ee' : '#262626',
                        strokeWidth: isSelected ? 1.5 : 0.3,
                        outline: 'none',
                        cursor: countryData ? 'pointer' : 'default',
                        transition: 'fill 0.2s ease, stroke 0.2s ease',
                      },
                      hover: {
                        fill: countryData ? '#fbbf24' : fill,
                        stroke: countryData ? '#fbbf24' : '#262626',
                        strokeWidth: countryData ? 1 : 0.3,
                        outline: 'none',
                        cursor: countryData ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: '#f59e0b',
                        stroke: '#f59e0b',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none fixed z-50 rounded-md border border-border/50 bg-card/95 px-3 py-1.5 shadow-xl backdrop-blur-sm"
            style={{
              left: tooltipPosition.x + 12,
              top: tooltipPosition.y - 35,
            }}
          >
            <span className="text-xs font-medium text-foreground">
              {tooltipContent}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WorldMap = memo(WorldMapComponent);
