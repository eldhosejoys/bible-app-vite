import MiniSearch from 'minisearch';
import { bookMap } from '../config/siteConfig';

// In-memory cache for MiniSearch instances per dataset/language
const indexCache = new Map();

/**
 * Normalizes text for consistent search:
 * - Unicode NFC normalization
 * - Converts legacy Malayalam ZWJ chillu sequences to modern atomic chillu characters
 * - Strips zero-width and invisible formatting characters
 * - Lowercases strings for case-insensitive matching
 */
export function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFC')
    // Legacy Malayalam ZWJ chillu -> modern atomic chillu
    .replace(/\u0D23\u0D4D\u200D/g, '\u0D7A') // ൺ
    .replace(/\u0D28\u0D4D\u200D/g, '\u0D7B') // ൻ
    .replace(/\u0D30\u0D4D\u200D/g, '\u0D7C') // ർ
    .replace(/\u0D32\u0D4D\u200D/g, '\u0D7D') // ൽ
    .replace(/\u0D33\u0D4D\u200D/g, '\u0D7E') // ൾ
    .replace(/\u0D15\u0D4D\u200D/g, '\u0D7F') // ൿ
    // Strip zero-width joiners / non-joiners
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();
}

/**
 * Escapes regex special characters safely
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely highlights all matched query terms in verse text without regex errors.
 * Also accounts for Malayalam chillu character variants so text highlights regardless of encoding.
 */
export function highlightVerseText(text, query) {
  if (!text || !query) return text;

  // Split query into individual words/tokens, trimming punctuation
  const terms = query
    .trim()
    .split(/\s+/)
    .map(t => t.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, ''))
    .filter(t => t.length > 0);

  if (terms.length === 0) return text;

  // Build pattern for each term, handling chillu variations
  const patterns = terms.map(term => {
    let p = escapeRegex(term);
    p = p.replace(/\u0D7A/g, '(?:\u0D7A|\u0D23\u0D4D\u200D)');
    p = p.replace(/\u0D7B/g, '(?:\u0D7B|\u0D28\u0D4D\u200D)');
    p = p.replace(/\u0D7C/g, '(?:\u0D7C|\u0D30\u0D4D\u200D)');
    p = p.replace(/\u0D7D/g, '(?:\u0D7D|\u0D32\u0D4D\u200D)');
    p = p.replace(/\u0D7E/g, '(?:\u0D7E|\u0D33\u0D4D\u200D)');
    p = p.replace(/\u0D7F/g, '(?:\u0D7F|\u0D15\u0D4D\u200D)');
    return p;
  });

  try {
    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
    return text.replace(regex, `<span class='text-dark' style='background-color: #fff952;'>$1</span>`);
  } catch (err) {
    return text;
  }
}

/**
 * Parses user input to check if it's a direct Bible reference (e.g., "John 3:16", "യോഹന്നാൻ 3:16", "Gen 1:1", "1/2/3").
 */
export function parseReference(query, titleList = []) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim();

  // Pattern 1: Slash notation: 1/2/3 or 1/2
  const slashMatch = q.match(/^(\d+)(?:\/(\d+))?(?:\/(\d+))?$/);
  if (slashMatch) {
    return {
      book: parseInt(slashMatch[1], 10),
      chapter: slashMatch[2] ? parseInt(slashMatch[2], 10) : null,
      verse: slashMatch[3] ? parseInt(slashMatch[3], 10) : null
    };
  }

  // Pattern 2: [optional 1-3] [Book Name] [Chapter]:[Verse] or [Chapter] [Verse]
  // Uses \p{L}\p{M} to properly capture letters + Indic vowel marks / viramas
  const refMatch = q.match(/^([1-3]?\s*[\p{L}\p{M}\s]+?)\s*(\d+)(?:[:.\s](\d+))?$/u);
  if (!refMatch) return null;

  const rawBook = normalizeText(refMatch[1].trim());
  const chapter = parseInt(refMatch[2], 10);
  const verse = refMatch[3] ? parseInt(refMatch[3], 10) : null;

  // 1. Check in bookMap (abbreviations like 'gen', 'matt', '1sam', 'rom')
  const mappedBookNum = bookMap[rawBook.replace(/\s+/g, '')];
  if (mappedBookNum && titleList.length > 0) {
    const titleObj = titleList.find(t => Number(t.n) === Number(mappedBookNum));
    if (titleObj) {
      return {
        book: titleObj.n,
        bookName: titleObj.bm,
        bookEnglish: titleObj.be,
        chapter,
        verse
      };
    }
  }

  // 2. Exact match in title list
  let found = titleList.find(t => {
    const bmNorm = normalizeText(t.bm);
    const beNorm = normalizeText(t.be);
    return bmNorm === rawBook || beNorm === rawBook;
  });

  // 3. Prefix match (e.g. "സങ്കീ" or "Gen")
  if (!found) {
    found = titleList.find(t => {
      const bmNorm = normalizeText(t.bm);
      const beNorm = normalizeText(t.be);
      return bmNorm.startsWith(rawBook) || beNorm.startsWith(rawBook);
    });
  }

  // 4. Common root match for Malayalam plurals / variations (e.g., "സങ്കീർത്തനം" vs "സങ്കീർത്തനങ്ങൾ")
  if (!found && rawBook.length > 4) {
    const root = rawBook.slice(0, rawBook.length - 2);
    found = titleList.find(t => {
      const bmNorm = normalizeText(t.bm);
      return bmNorm.includes(root);
    });
  }

  if (found) {
    return {
      book: found.n,
      bookName: found.bm,
      bookEnglish: found.be,
      chapter,
      verse
    };
  }

  return null;
}

/**
 * Returns or builds a MiniSearch index for the provided bibleData.
 */
export function getOrCreateIndex(bibleData, cacheKey = 'default') {
  if (!bibleData || bibleData.length === 0) return null;

  if (indexCache.has(cacheKey)) {
    return indexCache.get(cacheKey);
  }

  const miniSearch = new MiniSearch({
    fields: ['t', 'normT'],
    storeFields: ['b', 'c', 'v', 't'],
    extractField: (doc, fieldName) => {
      if (fieldName === 'id') return `${doc.b}_${doc.c}_${doc.v}`;
      if (fieldName === 'normT') return normalizeText(doc.t);
      return doc[fieldName];
    },
    processTerm: (term) => normalizeText(term)
  });

  miniSearch.addAll(bibleData);
  indexCache.set(cacheKey, miniSearch);
  return miniSearch;
}

/**
 * Clear the index cache (e.g., on language change or memory cleanup)
 */
export function clearIndexCache() {
  indexCache.clear();
}

/**
 * Executes an optimized Bible search using MiniSearch + Reference matching + Fallbacks.
 */
export function searchBible(query, bibleData, titleList = [], cacheKey = 'default') {
  if (!query || !query.trim()) {
    return bibleData;
  }

  const trimmedQuery = query.trim();

  // 1. Direct Reference Search (e.g. "John 3:16", "യോഹന്നാൻ 3:16", "റോമർ 8:28")
  const ref = parseReference(trimmedQuery, titleList);
  let refResults = [];
  if (ref) {
    refResults = bibleData.filter(item => {
      if (Number(item.b) !== Number(ref.book)) return false;
      if (ref.chapter && Number(item.c) !== Number(ref.chapter)) return false;
      if (ref.verse && Number(item.v) !== Number(ref.verse)) return false;
      return true;
    });

    // If an exact single verse reference is found, return it as primary match
    if (ref.verse && refResults.length > 0) {
      return refResults;
    }
  }

  // 2. Full-Text Search via MiniSearch
  let msResults = [];
  const index = getOrCreateIndex(bibleData, cacheKey);

  if (index) {
    try {
      // First try strict conjunction (AND) with prefix and fuzzy options
      msResults = index.search(trimmedQuery, {
        prefix: true,
        fuzzy: (term) => (term.length > 3 ? 0.2 : false),
        combineWith: 'AND',
        processTerm: (term) => normalizeText(term)
      });

      // If AND yielded no results, fallback to OR (ranked by relevance)
      if (msResults.length === 0) {
        msResults = index.search(trimmedQuery, {
          prefix: true,
          fuzzy: (term) => (term.length > 3 ? 0.2 : false),
          combineWith: 'OR',
          processTerm: (term) => normalizeText(term)
        });
      }
    } catch (err) {
      console.warn("MiniSearch search failed, falling back to substring filter:", err);
    }
  }

  // 3. Merge Reference Results & Full-Text Results without duplicates
  const seen = new Set();
  const combined = [];

  for (const item of refResults) {
    const key = `${item.b}_${item.c}_${item.v}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  for (const item of msResults) {
    const key = `${item.b}_${item.c}_${item.v}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  // 4. Safety net fallback: if MiniSearch returned nothing, perform normalized substring match
  if (combined.length === 0) {
    const normQ = normalizeText(trimmedQuery);
    return bibleData.filter(item => normalizeText(item.t).includes(normQ));
  }

  return combined;
}
