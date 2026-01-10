
import axios from 'axios';

let parsedCrossReferences = null;
let abbreviationMap = null;
let loadPromise = null;

// Standard abbrevs path - adjust if needed
const ABBREVS_URL = "/assets/json/abbrevs.json";
const REFERENCES_URL = "/assets/txt/cross_references.txt";

const loadData = async () => {
    try {
        const [abbrevsRes, textRes] = await Promise.all([
            axios.get(ABBREVS_URL),
            axios.get(REFERENCES_URL)
        ]);

        const abbrevs = abbrevsRes.data;
        const text = textRes.data;

        // Build efficient map for abbreviations -> Book ID
        abbreviationMap = new Map();
        Object.entries(abbrevs).forEach(([key, value]) => {
            abbreviationMap.set(key, value);
        });

        // Parse the text file
        parsedCrossReferences = new Map();

        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split('\t');
            if (parts.length < 3) continue;

            const [fromRef, toRef, votes] = parts;

            // Parse From Reference
            const fromParts = parseReference(fromRef);
            if (!fromParts) continue;

            const { b: fromBook, c: fromChapter, v: fromVerse } = fromParts;

            // Parse To Reference(s)
            // Handle ranges like "Ps.89.11-Ps.89.12"
            const toRefs = toRef.split('-').map(refStr => {
                const p = parseReference(refStr);
                return p ? `${p.b}/${p.c}/${p.v}` : null;
            }).filter(Boolean);

            if (toRefs.length === 0) continue;

            // Initialize structure for this book if not exists
            if (!parsedCrossReferences.has(fromBook)) {
                parsedCrossReferences.set(fromBook, []);
            }

            // check if there is an existing entry for this verse, if so we append to it?
            // The existing JSON array in Content.jsx has multiple entries for the same verse.
            // e.g. [{c:1,v:1,to:...,lyk:...}, {c:1,v:1,to:...,lyk:...}]
            // So we just push.

            parsedCrossReferences.get(fromBook).push({
                c: fromChapter,
                v: fromVerse,
                to: toRefs,
                lyk: parseInt(votes, 10) || 0
            });
        }

    } catch (error) {
        console.error("Failed to load cross references:", error);
        parsedCrossReferences = new Map(); // Fallback to empty to prevent infinite loading
    }
};

const parseReference = (refString) => {
    // Format: "Gen.1.1" or "1Cor.1.1" or "Ps.119.105"
    // We need to split by '.' but be careful about book names.
    // Actually, most book names don't have dots, except maybe abbreviations?
    // In cross_references.txt (from view_file): "Gen.1.1", "1Cor.8.6", "Ps.89.11"
    // So the last two parts are always chapter and verse. The rest is book name.

    const parts = refString.split('.');
    if (parts.length < 3) return null;

    const verse = parts.pop();
    const chapter = parts.pop();
    const bookAbbrev = parts.join('.'); // Rejoin in case book name has dots? Unlikely per abbrevs.json but safer.

    // Map abbreviation to ID
    const bookId = abbreviationMap.get(bookAbbrev);
    if (!bookId) {
        // console.warn("Unknown book abbreviation:", bookAbbrev);
        return null;
    }

    return { b: bookId, c: parseInt(chapter, 10), v: parseInt(verse, 10) };
};

export const getCrossReferencesForBook = async (bookId) => {
    if (!parsedCrossReferences) {
        if (!loadPromise) {
            loadPromise = loadData();
        }
        await loadPromise;
    }

    // Return the array for this book or empty array
    // Note: The existing format uses bookId as number.
    const bookIdNum = Number(bookId);
    return parsedCrossReferences ? (parsedCrossReferences.get(bookIdNum) || []) : [];
};
