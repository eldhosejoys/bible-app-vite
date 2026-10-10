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
 * Extracts the base stem of a word for Malayalam and English:
 * - Malayalam: strips terminal virama (്), vowel u (ു), anusvara (ം), or chillu letters (ൻ, ൽ, ർ, ൾ, ൺ, ൿ)
 * - English: strips common grammatical inflection suffixes (ing, ed, es, s)
 */
export function getStem(word) {
  let w = normalizeText(word);
  w = w.replace(/[\u0D4D\u0D41\u0D02\u0D7A-\u0D7F]$/, '');
  w = w.replace(/(ing|ed|es|s)$/i, '');
  return w;
}

/**
 * Highlights matched query terms in verse text:
 * - Exact matches (identical word/term) are highlighted in the vivid current color (#fff952).
 * - Morphological / stem / inflection variants (e.g. വെളിപ്പാട് vs വെളിപ്പാടു vs വെളിപ്പാടും, യോഹന്നാൻ vs യോഹന്നാന്റെ, love vs loved)
 *   are highlighted in a softer, lighter pastel version (#fffca8).
 */
export function highlightVerseText(text, query) {
  if (!text || !query) return text;

  // Unicode NFC normalization merges decomposed 2-part vowels (e.g. േ + ാ into ോ)
  const normalizedText = text.normalize('NFC');
  const normalizedQuery = query.normalize('NFC');

  // Split query into individual words/tokens, trimming punctuation
  const queryTerms = normalizedQuery
    .trim()
    .split(/\s+/)
    .map(t => t.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, ''))
    .filter(t => t.length > 0);

  if (queryTerms.length === 0) return normalizedText;

  const exactTermSet = new Set(queryTerms.map(t => normalizeText(t)));
  const termStems = queryTerms.map(t => ({
    term: normalizeText(t),
    stem: getStem(t)
  }));

  // EXACT MATCH: vivid bright yellow
  const EXACT_STYLE = "class='text-dark' style='background-color: #fff952;'";
  // VARIANT / STEM / SUFFIX MATCH: softer, lighter pastel yellow
  const LIGHT_STYLE = "class='text-dark' style='background-color: #fffca8;'";

  // Match words preserving surrounding punctuation and whitespace
  const wordRegex = /([\p{L}\p{M}\p{N}]+)/gu;

  try {
    return normalizedText.replace(wordRegex, (match) => {
      const normWord = normalizeText(match);

      // 1. Exact match check
      if (exactTermSet.has(normWord)) {
        return `<span ${EXACT_STYLE}>${match}</span>`;
      }

      // 2. Variant / stem / inflection match check
      const wordStem = getStem(normWord);

      for (const { term, stem } of termStems) {
        if (!stem || stem.length < 2) continue;

        // Same stem (e.g. വെളിപ്പാടു vs വെളിപ്പാട് -> both stem to വെളിപ്പാട)
        if (wordStem === stem) {
          return `<span ${LIGHT_STYLE}>${match}</span>`;
        }

        // Word starts with query stem (e.g. വെളിപ്പാടും, യോഹന്നാന്റെ, loved)
        if (stem.length >= 3 && normWord.startsWith(stem)) {
          return `<span ${LIGHT_STYLE}>${match}</span>`;
        }

        // Query starts with word stem (e.g. query had extra suffix)
        if (wordStem.length >= 3 && term.startsWith(wordStem)) {
          return `<span ${LIGHT_STYLE}>${match}</span>`;
        }
      }

      return match;
    });
  } catch (err) {
    return normalizedText;
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
