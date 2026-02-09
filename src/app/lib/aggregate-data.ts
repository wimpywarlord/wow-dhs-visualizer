import { readFileSync } from 'fs';
import { join } from 'path';
import { countryCodeMap } from '../data/country-codes';

interface DHSRecord {
  id: string;
  name: string;
  country: string;
  crimes: string[];
  arrestLocation: {
    city: string;
    state: string;
  };
  imageUrl: string;
  profileUrl: string;
  scrapedAt: string;
}

interface CrimeCount {
  crime: string;
  count: number;
}

export interface CountryData {
  country: string;
  countryCode: string;
  count: number;
  crimes: CrimeCount[];
}

export interface AggregatedData {
  total: number;
  countries: CountryData[];
  byIsoCode: Record<string, CountryData>;
}

function normalizeCrime(crime: string): string {
  // Clean up crime strings - remove gang affiliations, extra whitespace
  let normalized = crime
    .replace(/\n\s*Gang Affiliation:.*$/s, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove "Arrested for:" prefix
  normalized = normalized.replace(/^Arrested for:\s*/i, '');

  return normalized;
}

export function aggregateData(): AggregatedData {
  const dataPath = join(process.cwd(), 'data', 'dhs-records.jsonl');
  const content = readFileSync(dataPath, 'utf-8');
  const lines = content.trim().split('\n');

  const countryMap = new Map<
    string,
    {
      count: number;
      crimes: Map<string, number>;
    }
  >();

  let total = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const record: DHSRecord = JSON.parse(line);
    total++;

    const country = record.country;
    if (!countryMap.has(country)) {
      countryMap.set(country, { count: 0, crimes: new Map() });
    }

    const countryData = countryMap.get(country)!;
    countryData.count++;

    for (const crime of record.crimes) {
      const normalizedCrime = normalizeCrime(crime);
      if (normalizedCrime) {
        countryData.crimes.set(
          normalizedCrime,
          (countryData.crimes.get(normalizedCrime) || 0) + 1
        );
      }
    }
  }

  const countries: CountryData[] = [];
  const byIsoCode: Record<string, CountryData> = {};

  for (const [country, data] of countryMap.entries()) {
    const isoCode = countryCodeMap[country] || '';

    const sortedCrimes = Array.from(data.crimes.entries())
      .map(([crime, count]) => ({ crime, count }))
      .sort((a, b) => b.count - a.count);

    const countryData: CountryData = {
      country,
      countryCode: isoCode,
      count: data.count,
      crimes: sortedCrimes,
    };

    countries.push(countryData);

    if (isoCode) {
      byIsoCode[isoCode] = countryData;
    }
  }

  // Sort countries by count descending
  countries.sort((a, b) => b.count - a.count);

  return { total, countries, byIsoCode };
}
