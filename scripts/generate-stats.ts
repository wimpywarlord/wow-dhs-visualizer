/**
 * Generate statistics from scraped DHS data
 *
 * Supports both JSONL format (new) and JSON format (legacy)
 * Usage: bun run scripts/generate-stats.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

interface Statistics {
  totalRecords: number;
  byCountry: Record<string, number>;
  byState: Record<string, number>;
  byCity: Record<string, number>;
  byCrime: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
  topStates: Array<{ state: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  topCrimes: Array<{ crime: string; count: number }>;
  generatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE_JSONL = path.join(DATA_DIR, 'dhs-records.jsonl');
const RECORDS_FILE_JSON = path.join(DATA_DIR, 'dhs-records.json');
const STATS_FILE = path.join(DATA_DIR, 'dhs-statistics.json');

// Load records from JSONL file (streaming, memory efficient)
const loadRecordsFromJsonl = async (): Promise<DHSRecord[]> => {
  const records: DHSRecord[] = [];

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(RECORDS_FILE_JSONL),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const record = JSON.parse(line) as DHSRecord;
          records.push(record);
        } catch {
          console.warn('Skipping malformed line');
        }
      }
    });

    rl.on('close', () => resolve(records));
    rl.on('error', reject);
  });
};

// Load records from JSON file (legacy format)
const loadRecordsFromJson = (): DHSRecord[] => {
  const data = fs.readFileSync(RECORDS_FILE_JSON, 'utf-8');
  return JSON.parse(data) as DHSRecord[];
};

// Process records and generate statistics (streaming version for large datasets)
const processRecordsStreaming = async (): Promise<Statistics> => {
  const byCountry: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const byCrime: Record<string, number> = {};
  let totalRecords = 0;

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(RECORDS_FILE_JSONL),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      if (!line.trim()) return;

      try {
        const record = JSON.parse(line) as DHSRecord;
        totalRecords++;

        // Count by country
        byCountry[record.country] = (byCountry[record.country] || 0) + 1;

        // Count by state
        if (record.arrestLocation.state) {
          byState[record.arrestLocation.state] =
            (byState[record.arrestLocation.state] || 0) + 1;
        }

        // Count by city
        if (record.arrestLocation.city) {
          const cityState = `${record.arrestLocation.city}, ${record.arrestLocation.state}`;
          byCity[cityState] = (byCity[cityState] || 0) + 1;
        }

        // Count by crime
        for (const crime of record.crimes) {
          const normalizedCrime = crime.trim();
          if (normalizedCrime) {
            byCrime[normalizedCrime] = (byCrime[normalizedCrime] || 0) + 1;
          }
        }
      } catch {
        // Skip malformed lines
      }
    });

    rl.on('close', () => {
      // Sort and get top entries
      const sortByCount = (
        obj: Record<string, number>
      ): Array<{ key: string; count: number }> => {
        return Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => ({ key, count }));
      };

      const topCountries = sortByCount(byCountry)
        .slice(0, 50)
        .map(({ key, count }) => ({ country: key, count }));

      const topStates = sortByCount(byState)
        .slice(0, 50)
        .map(({ key, count }) => ({ state: key, count }));

      const topCities = sortByCount(byCity)
        .slice(0, 100)
        .map(({ key, count }) => ({ city: key, count }));

      const topCrimes = sortByCount(byCrime)
        .slice(0, 100)
        .map(({ key, count }) => ({ crime: key, count }));

      resolve({
        totalRecords,
        byCountry,
        byState,
        byCity,
        byCrime,
        topCountries,
        topStates,
        topCities,
        topCrimes,
        generatedAt: new Date().toISOString(),
      });
    });

    rl.on('error', reject);
  });
};

// Process records from array (for JSON format)
const processRecordsArray = (records: DHSRecord[]): Statistics => {
  const byCountry: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byCity: Record<string, number> = {};
  const byCrime: Record<string, number> = {};

  for (const record of records) {
    byCountry[record.country] = (byCountry[record.country] || 0) + 1;

    if (record.arrestLocation.state) {
      byState[record.arrestLocation.state] =
        (byState[record.arrestLocation.state] || 0) + 1;
    }

    if (record.arrestLocation.city) {
      const cityState = `${record.arrestLocation.city}, ${record.arrestLocation.state}`;
      byCity[cityState] = (byCity[cityState] || 0) + 1;
    }

    for (const crime of record.crimes) {
      const normalizedCrime = crime.trim();
      if (normalizedCrime) {
        byCrime[normalizedCrime] = (byCrime[normalizedCrime] || 0) + 1;
      }
    }
  }

  const sortByCount = (
    obj: Record<string, number>
  ): Array<{ key: string; count: number }> => {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  };

  return {
    totalRecords: records.length,
    byCountry,
    byState,
    byCity,
    byCrime,
    topCountries: sortByCount(byCountry)
      .slice(0, 50)
      .map(({ key, count }) => ({ country: key, count })),
    topStates: sortByCount(byState)
      .slice(0, 50)
      .map(({ key, count }) => ({ state: key, count })),
    topCities: sortByCount(byCity)
      .slice(0, 100)
      .map(({ key, count }) => ({ city: key, count })),
    topCrimes: sortByCount(byCrime)
      .slice(0, 100)
      .map(({ key, count }) => ({ crime: key, count })),
    generatedAt: new Date().toISOString(),
  };
};

const main = async (): Promise<void> => {
  console.log('=== Generating DHS Statistics ===\n');

  let statistics: Statistics;

  // Prefer JSONL format (new), fall back to JSON (legacy)
  if (fs.existsSync(RECORDS_FILE_JSONL)) {
    console.log(`Reading from JSONL: ${RECORDS_FILE_JSONL}`);
    statistics = await processRecordsStreaming();
  } else if (fs.existsSync(RECORDS_FILE_JSON)) {
    console.log(`Reading from JSON: ${RECORDS_FILE_JSON}`);
    const records = loadRecordsFromJson();
    console.log(`Processing ${records.length} records...\n`);
    statistics = processRecordsArray(records);
  } else {
    console.error('No records file found. Run the scraper first.');
    console.error(`  Expected: ${RECORDS_FILE_JSONL}`);
    console.error(`  Or: ${RECORDS_FILE_JSON}`);
    process.exit(1);
  }

  // Save statistics
  fs.writeFileSync(STATS_FILE, JSON.stringify(statistics, null, 2));

  // Print summary
  console.log('\n=== Summary ===\n');
  console.log(`Total Records: ${statistics.totalRecords}`);
  console.log(`Unique Countries: ${Object.keys(statistics.byCountry).length}`);
  console.log(`Unique States: ${Object.keys(statistics.byState).length}`);
  console.log(`Unique Cities: ${Object.keys(statistics.byCity).length}`);
  console.log(`Unique Crimes: ${Object.keys(statistics.byCrime).length}`);

  console.log('\n=== Top 10 Countries ===');
  statistics.topCountries.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.country}: ${c.count}`);
  });

  console.log('\n=== Top 10 States ===');
  statistics.topStates.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.state}: ${s.count}`);
  });

  console.log('\n=== Top 10 Crimes ===');
  statistics.topCrimes.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.crime}: ${c.count}`);
  });

  console.log(`\nStatistics saved to: ${STATS_FILE}`);
};

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
