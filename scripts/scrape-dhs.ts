/**
 * DHS WoW Data Scraper - Production Ready
 *
 * A fault-tolerant, resumable, memory-efficient scraper for the DHS "Worst of the Worst" website.
 *
 * Features:
 * - JSONL output format (append-only, memory efficient)
 * - Smart rate limiting with jitter and exponential backoff
 * - Robust retry logic with specific error handling
 * - Browser-like headers with User-Agent rotation
 * - Frequent saves (after every page)
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Progress tracking with ETA
 *
 * Usage:
 *   bun run scrape [options]
 *
 * Options:
 *   --start-page=0       Starting page (0-indexed)
 *   --end-page=2084      Ending page
 *   --min-delay=2000     Minimum delay between requests (ms)
 *   --max-delay=5000     Maximum delay between requests (ms)
 *   --max-retries=3      Max retries per page
 *   --resume             Resume from last checkpoint (default: true)
 *   --fresh              Start fresh, ignore existing state
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================================
// Types
// ============================================================================

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

interface ScraperState {
  lastCompletedPage: number;
  totalRecords: number;
  startedAt: string;
  lastUpdatedAt: string;
  pagesScraped: number;
  errorCount: number;
}

interface ScraperStats {
  requestCount: number;
  totalRequestTime: number;
  errorCount: number;
  retryCount: number;
  recordsAdded: number;
  startTime: number;
}

interface FailedPage {
  page: number;
  attempts: number;
  lastError: string;
  lastAttemptAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = 'https://www.dhs.gov/wow';
const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'dhs-records.jsonl');
const IDS_FILE = path.join(DATA_DIR, 'dhs-ids.txt');
const STATE_FILE = path.join(DATA_DIR, 'scraper-state.json');
const FAILED_PAGES_FILE = path.join(DATA_DIR, 'failed-pages.json');

// User-Agent rotation pool (realistic browser User-Agents)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// ============================================================================
// Command Line Argument Parsing
// ============================================================================

const args = process.argv.slice(2);

const getArgNumber = (name: string, defaultValue: number): number => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? parseInt(arg.split('=')[1], 10) : defaultValue;
};

const hasFlag = (name: string): boolean => {
  return args.includes(`--${name}`);
};

const CONFIG = {
  startPage: getArgNumber('start-page', 0),
  endPage: getArgNumber('end-page', 2084),
  minDelay: getArgNumber('min-delay', 2000),
  maxDelay: getArgNumber('max-delay', 5000),
  maxRetries: getArgNumber('max-retries', 3),
  resume: !hasFlag('fresh'),
  jitter: 500, // ±500ms randomness
};

// ============================================================================
// Global State
// ============================================================================

let isShuttingDown = false;
let existingIds: Set<string> = new Set();
let stats: ScraperStats = {
  requestCount: 0,
  totalRequestTime: 0,
  errorCount: 0,
  retryCount: 0,
  recordsAdded: 0,
  startTime: Date.now(),
};

// ============================================================================
// Utility Functions
// ============================================================================

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getRandomDelay = (): number => {
  const base = CONFIG.minDelay + Math.random() * (CONFIG.maxDelay - CONFIG.minDelay);
  const jitter = (Math.random() - 0.5) * 2 * CONFIG.jitter;
  return Math.max(CONFIG.minDelay, Math.round(base + jitter));
};

const getRandomUserAgent = (): string => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const formatETA = (currentPage: number, startPage: number): string => {
  const pagesCompleted = currentPage - startPage;
  if (pagesCompleted === 0) return 'calculating...';

  const elapsed = Date.now() - stats.startTime;
  const avgTimePerPage = elapsed / pagesCompleted;
  const pagesRemaining = CONFIG.endPage - currentPage;
  const etaMs = avgTimePerPage * pagesRemaining;

  return formatDuration(etaMs);
};

// ============================================================================
// File Operations
// ============================================================================

const ensureDataDir = (): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Load existing IDs from IDs file for fast deduplication
const loadExistingIds = (): Set<string> => {
  const ids = new Set<string>();

  if (fs.existsSync(IDS_FILE)) {
    const content = fs.readFileSync(IDS_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const id = line.trim();
      if (id) ids.add(id);
    }
    console.log(`Loaded ${ids.size} existing IDs from ${IDS_FILE}`);
  } else if (fs.existsSync(RECORDS_FILE)) {
    // Fallback: read IDs from JSONL file (slower but handles migration)
    console.log('Building ID index from JSONL file...');
    const fileStream = fs.createReadStream(RECORDS_FILE, 'utf-8');
    const lines = fileStream.toString().split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const record = JSON.parse(line) as DHSRecord;
          ids.add(record.id);
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Save IDs file for faster future loads
    fs.writeFileSync(IDS_FILE, Array.from(ids).join('\n'));
    console.log(`Built ID index with ${ids.size} records`);
  }

  return ids;
};

// Load existing IDs using streaming for large files
const loadExistingIdsStreaming = async (): Promise<Set<string>> => {
  const ids = new Set<string>();

  if (fs.existsSync(IDS_FILE)) {
    const content = fs.readFileSync(IDS_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const id = line.trim();
      if (id) ids.add(id);
    }
    console.log(`Loaded ${ids.size} existing IDs from ${IDS_FILE}`);
    return ids;
  }

  if (!fs.existsSync(RECORDS_FILE)) {
    return ids;
  }

  console.log('Building ID index from JSONL file (streaming)...');

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(RECORDS_FILE),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const record = JSON.parse(line) as DHSRecord;
          ids.add(record.id);
        } catch {
          // Skip malformed lines
        }
      }
    });

    rl.on('close', () => {
      // Save IDs file for faster future loads
      fs.writeFileSync(IDS_FILE, Array.from(ids).join('\n'));
      console.log(`Built ID index with ${ids.size} records`);
      resolve(ids);
    });

    rl.on('error', reject);
  });
};

// Append a single record to JSONL file
const appendRecord = (record: DHSRecord): void => {
  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(RECORDS_FILE, line);

  // Also append ID to IDs file
  fs.appendFileSync(IDS_FILE, record.id + '\n');

  existingIds.add(record.id);
  stats.recordsAdded++;
};

// Load scraper state
const loadState = (): ScraperState | null => {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data) as ScraperState;
    } catch {
      console.warn('Warning: Could not parse scraper state file');
      return null;
    }
  }
  return null;
};

// Save scraper state
const saveState = (state: ScraperState): void => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
};

// Load failed pages
const loadFailedPages = (): FailedPage[] => {
  if (fs.existsSync(FAILED_PAGES_FILE)) {
    try {
      const data = fs.readFileSync(FAILED_PAGES_FILE, 'utf-8');
      return JSON.parse(data) as FailedPage[];
    } catch {
      return [];
    }
  }
  return [];
};

// Save failed pages
const saveFailedPages = (pages: FailedPage[]): void => {
  fs.writeFileSync(FAILED_PAGES_FILE, JSON.stringify(pages, null, 2));
};

// ============================================================================
// HTML Parsing
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseCard = ($: cheerio.CheerioAPI, card: any): DHSRecord | null => {
  try {
    const $card = $(card);

    // Extract country from header
    const country = $card.find('.usa-card__heading').text().trim();

    // Extract name
    const name = $card.find('.usa-card_name').text().replace('Name:', '').trim();

    // Extract crimes
    const crimesText = $card
      .find('.usa-card__crime')
      .text()
      .replace('Convicted of:', '')
      .trim();
    const crimes = crimesText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // Extract location
    const locationText = $card
      .find('.usa-card__location')
      .text()
      .replace('Arrested:', '')
      .trim();
    const locationParts = locationText
      .split(',')
      .map((p) => p.replace(/\u00A0/g, ' ').trim());
    const city = locationParts[0] || '';
    const state = locationParts[1] || '';

    // Extract image URL
    const imgSrc = $card.find('.usa-card__img img').attr('src') || '';
    const imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.dhs.gov${imgSrc}`;

    // Extract profile URL from social share links
    const shareLink = $card.find('.usa-card__social a').first().attr('href') || '';
    const urlMatch = shareLink.match(/url=([^&]+)/);
    const profileUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : '';

    // Generate ID from name (slugified)
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!name || !country) {
      return null;
    }

    return {
      id,
      name,
      country,
      crimes,
      arrestLocation: { city, state },
      imageUrl,
      profileUrl,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing card:', error);
    return null;
  }
};

// ============================================================================
// HTTP Request with Retry Logic
// ============================================================================

interface FetchResult {
  html: string;
  retryAfter?: number;
}

const fetchWithRetry = async (
  url: string,
  pageNum: number,
  referer?: string
): Promise<FetchResult> => {
  const headers: Record<string, string> = {
    'User-Agent': getRandomUserAgent(),
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  let lastError: Error | null = null;
  let currentDelay = 5000; // Start with 5s backoff

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    if (isShuttingDown) {
      throw new Error('Scraper is shutting down');
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, { headers });
      const requestTime = Date.now() - startTime;

      stats.requestCount++;
      stats.totalRequestTime += requestTime;

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.warn(
          `  [429] Rate limited on page ${pageNum + 1}. Waiting ${retryAfter}s...`
        );
        await sleep(retryAfter * 1000);
        stats.retryCount++;
        continue;
      }

      // Handle service unavailable
      if (response.status === 503) {
        console.warn(
          `  [503] Service unavailable for page ${pageNum + 1}. Attempt ${attempt}/${CONFIG.maxRetries}. Waiting ${currentDelay / 1000}s...`
        );
        await sleep(currentDelay);
        currentDelay *= 3; // Exponential backoff: 5s, 15s, 45s
        stats.retryCount++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return { html };
    } catch (error) {
      lastError = error as Error;
      stats.errorCount++;

      if (attempt < CONFIG.maxRetries) {
        console.warn(
          `  Error on page ${pageNum + 1} (attempt ${attempt}/${CONFIG.maxRetries}): ${lastError.message}`
        );
        console.warn(`  Retrying in ${currentDelay / 1000}s...`);
        await sleep(currentDelay);
        currentDelay *= 3; // Exponential backoff
        stats.retryCount++;
      }
    }
  }

  throw lastError || new Error('Unknown error');
};

// ============================================================================
// Page Scraping
// ============================================================================

const scrapePage = async (
  pageNum: number,
  referer?: string
): Promise<{ records: DHSRecord[]; url: string }> => {
  const url = pageNum === 0 ? BASE_URL : `${BASE_URL}?page=${pageNum}`;

  const { html } = await fetchWithRetry(url, pageNum, referer);
  const $ = cheerio.load(html);

  const records: DHSRecord[] = [];
  $('.usa-card').each((_, card) => {
    const record = parseCard($, card);
    if (record) {
      records.push(record);
    }
  });

  return { records, url };
};

// ============================================================================
// Progress Display
// ============================================================================

const printProgress = (
  currentPage: number,
  startPage: number,
  newRecordsOnPage: number
): void => {
  const totalPages = CONFIG.endPage - startPage + 1;
  const pagesCompleted = currentPage - startPage + 1;
  const percentage = ((pagesCompleted / totalPages) * 100).toFixed(1);
  const eta = formatETA(currentPage, startPage);

  console.log(
    `[${percentage}%] Page ${currentPage + 1}/${CONFIG.endPage + 1} | ` +
      `+${newRecordsOnPage} records | ` +
      `Total: ${existingIds.size} | ` +
      `ETA: ${eta}`
  );
};

const printStats = (currentPage: number, startPage: number): void => {
  const elapsed = Date.now() - stats.startTime;
  const avgRequestTime =
    stats.requestCount > 0
      ? (stats.totalRequestTime / stats.requestCount).toFixed(0)
      : 0;

  console.log('\n--- Statistics ---');
  console.log(`Pages scraped: ${currentPage - startPage + 1}`);
  console.log(`Total records: ${existingIds.size}`);
  console.log(`New records added: ${stats.recordsAdded}`);
  console.log(`Requests made: ${stats.requestCount}`);
  console.log(`Avg request time: ${avgRequestTime}ms`);
  console.log(`Retries: ${stats.retryCount}`);
  console.log(`Errors: ${stats.errorCount}`);
  console.log(`Elapsed: ${formatDuration(elapsed)}`);
  console.log('------------------\n');
};

// ============================================================================
// Graceful Shutdown
// ============================================================================

const setupGracefulShutdown = (
  currentPageRef: { value: number },
  startPage: number
): void => {
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n\nReceived ${signal}. Saving state and shutting down...`);

    // Save current state
    const state: ScraperState = {
      lastCompletedPage: currentPageRef.value - 1, // Last fully completed page
      totalRecords: existingIds.size,
      startedAt: new Date(stats.startTime).toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      pagesScraped: currentPageRef.value - startPage,
      errorCount: stats.errorCount,
    };

    saveState(state);

    console.log(`\nState saved. Last completed page: ${state.lastCompletedPage + 1}`);
    console.log(`Total records: ${existingIds.size}`);
    console.log(`\nTo resume, run: bun run scrape`);
    console.log(
      `To start fresh, run: bun run scrape --fresh --start-page=${state.lastCompletedPage + 1}`
    );

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// ============================================================================
// Main Scraper
// ============================================================================

const main = async (): Promise<void> => {
  console.log('='.repeat(60));
  console.log('DHS WoW Data Scraper - Production Ready');
  console.log('='.repeat(60));
  console.log('');
  console.log('Configuration:');
  console.log(`  Pages: ${CONFIG.startPage + 1} to ${CONFIG.endPage + 1}`);
  console.log(`  Delay: ${CONFIG.minDelay}ms - ${CONFIG.maxDelay}ms (±${CONFIG.jitter}ms jitter)`);
  console.log(`  Max retries: ${CONFIG.maxRetries}`);
  console.log(`  Resume mode: ${CONFIG.resume}`);
  console.log('');

  // Ensure data directory exists
  ensureDataDir();

  // Load existing IDs for deduplication
  existingIds = await loadExistingIdsStreaming();

  // Determine starting page
  let startPage = CONFIG.startPage;

  if (CONFIG.resume) {
    const state = loadState();
    if (state && state.lastCompletedPage >= CONFIG.startPage) {
      startPage = state.lastCompletedPage + 1;
      console.log(`Resuming from page ${startPage + 1} (last completed: ${state.lastCompletedPage + 1})`);
      console.log(`Existing records: ${existingIds.size}`);
    }
  }

  if (startPage > CONFIG.endPage) {
    console.log('All pages already scraped. Nothing to do.');
    return;
  }

  // Track current page for graceful shutdown
  const currentPageRef = { value: startPage };
  setupGracefulShutdown(currentPageRef, startPage);

  // Load failed pages from previous run
  let failedPages = loadFailedPages();
  const newFailedPages: FailedPage[] = [];

  console.log('');
  console.log('Starting scrape...');
  console.log('');

  stats.startTime = Date.now();
  let lastUrl: string | undefined;

  for (let page = startPage; page <= CONFIG.endPage; page++) {
    if (isShuttingDown) break;

    currentPageRef.value = page;

    try {
      const { records, url } = await scrapePage(page, lastUrl);
      lastUrl = url;

      // Add only new records
      let newRecordsOnPage = 0;
      for (const record of records) {
        if (!existingIds.has(record.id)) {
          appendRecord(record);
          newRecordsOnPage++;
        }
      }

      // Print progress
      printProgress(page, startPage, newRecordsOnPage);

      // Save state after every page
      const state: ScraperState = {
        lastCompletedPage: page,
        totalRecords: existingIds.size,
        startedAt: new Date(stats.startTime).toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        pagesScraped: page - startPage + 1,
        errorCount: stats.errorCount,
      };
      saveState(state);

      // Print detailed stats every 50 pages
      if ((page - startPage + 1) % 50 === 0) {
        printStats(page, startPage);
      }

      // Rate limiting with random delay
      if (page < CONFIG.endPage && !isShuttingDown) {
        const delay = getRandomDelay();
        await sleep(delay);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to scrape page ${page + 1} after ${CONFIG.maxRetries} attempts: ${errorMessage}`);

      // Track failed page
      newFailedPages.push({
        page,
        attempts: CONFIG.maxRetries,
        lastError: errorMessage,
        lastAttemptAt: new Date().toISOString(),
      });

      // Save failed pages incrementally
      saveFailedPages([...failedPages, ...newFailedPages]);

      // Slow down after errors
      const errorDelay = CONFIG.maxDelay * 2;
      console.log(`Slowing down for ${errorDelay / 1000}s before continuing...`);
      await sleep(errorDelay);
    }
  }

  // Final state save
  if (!isShuttingDown) {
    const finalState: ScraperState = {
      lastCompletedPage: CONFIG.endPage,
      totalRecords: existingIds.size,
      startedAt: new Date(stats.startTime).toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      pagesScraped: CONFIG.endPage - startPage + 1,
      errorCount: stats.errorCount,
    };
    saveState(finalState);

    // Save any new failed pages
    if (newFailedPages.length > 0) {
      saveFailedPages([...failedPages, ...newFailedPages]);
    }
  }

  // Final summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Scraping Complete');
  console.log('='.repeat(60));
  printStats(CONFIG.endPage, startPage);

  if (newFailedPages.length > 0) {
    console.log(`\nFailed pages: ${newFailedPages.length}`);
    console.log(`See ${FAILED_PAGES_FILE} for details`);
    console.log('To retry failed pages, run with --start-page for each page');
  }

  console.log(`\nOutput files:`);
  console.log(`  Records: ${RECORDS_FILE}`);
  console.log(`  IDs: ${IDS_FILE}`);
  console.log(`  State: ${STATE_FILE}`);
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
