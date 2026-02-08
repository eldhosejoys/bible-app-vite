/**
 * VerseStorage - Utility for managing verse-related data in IndexedDB
 * Handles: Bookmarks, Notes, Highlights, and History
 * 
 * Compact Storage Format:
 * - History ID: "book/chapter" or "book/chapter:verse" or "book/chapter:start-end"
 * - Bookmarks/Notes/Highlights: { id: "book/chapter", v: [1,2,3], ... }
 */

import { IndexedDBService } from '../services/IndexedDBService';

const STORES = {
    BOOKMARKS: 'bookmarks',
    NOTES: 'notes',
    HIGHLIGHTS: 'highlights',
    HISTORY: 'history',
};

// Event Bus for Data Updates
const listeners = new Set();

export const onVerseStorageChange = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notifyChange = () => {
    listeners.forEach(cb => cb());
};

// Helper to generate compact ID for history
// Format: "book/chapter" or "book/chapter:verse" or "book/chapter:start-end"
export const generateHistoryId = (book, chapter, verse = null, endVerse = null) => {
    if (!verse) return `${book}/${chapter}`;
    if (endVerse && endVerse !== verse) {
        return `${book}/${chapter}:${verse}-${endVerse}`;
    }
    return `${book}/${chapter}:${verse}`;
};

// Helper to generate compact ID for bookmarks/notes/highlights
// Format: "book/chapter:verses" where verses can be "1" or "1-5" or "1,3,5"
export const generateVerseId = (book, chapter, verses) => {
    if (Array.isArray(verses) && verses.length > 0) {
        const sorted = [...verses].sort((a, b) => a - b);
        const start = sorted[0];
        const end = sorted[sorted.length - 1];

        if (start === end) return `${book}/${chapter}:${start}`;

        // Check if it's a contiguous range
        const isRange = sorted.length === (end - start + 1);
        if (isRange) return `${book}/${chapter}:${start}-${end}`;

        // Non-contiguous verses
        return `${book}/${chapter}:${sorted.join(',')}`;
    }
    return `${book}/${chapter}`;
};

// Helper to parse compact ID back to components
export const parseVerseId = (id) => {
    const [bookChapter, versesPart] = id.split(':');
    const [book, chapter] = bookChapter.split('/').map(Number);

    if (!versesPart) {
        return { book, chapter, verses: [] };
    }

    // Check if it's a range (e.g., "1-5")
    if (versesPart.includes('-') && !versesPart.includes(',')) {
        const [start, end] = versesPart.split('-').map(Number);
        const verses = [];
        for (let v = start; v <= end; v++) verses.push(v);
        return { book, chapter, verses, startVerse: start, endVerse: end };
    }

    // Check if it's a comma-separated list
    if (versesPart.includes(',')) {
        const verses = versesPart.split(',').map(Number);
        return { book, chapter, verses, startVerse: verses[0], endVerse: verses[verses.length - 1] };
    }

    // Single verse
    const verse = parseInt(versesPart);
    return { book, chapter, verses: [verse], startVerse: verse, endVerse: verse };
};

// ========== BOOKMARKS ==========
// Compact format: { id: "book/chapter:verses", v: [1,2,3], c: "2024-01-10T..." }

export const getBookmarks = async () => {
    return await IndexedDBService.getAll(STORES.BOOKMARKS);
};

export const countBookmarks = async () => {
    return await IndexedDBService.count(STORES.BOOKMARKS);
};

export const addBookmark = async (book, chapter, startVerse, endVerse, selectedVerses = null) => {
    let verses;
    if (selectedVerses && Array.isArray(selectedVerses)) {
        verses = [...selectedVerses].sort((a, b) => a - b);
    } else {
        verses = [];
        for (let v = startVerse; v <= (endVerse || startVerse); v++) {
            verses.push(v);
        }
    }

    const id = generateVerseId(book, chapter, verses);

    const existing = await IndexedDBService.get(STORES.BOOKMARKS, id);
    if (existing) {
        return { success: false, message: 'Already bookmarked' };
    }

    // Compact storage: only store id, verses array, and timestamp
    const bookmark = {
        id,
        v: verses,
        c: new Date().toISOString(),
    };

    await IndexedDBService.put(STORES.BOOKMARKS, bookmark);
    notifyChange();
    return { success: true, message: 'Bookmark added' };
};

export const removeBookmark = async (id) => {
    await IndexedDBService.delete(STORES.BOOKMARKS, id);
    notifyChange();
    return { success: true, message: 'Bookmark removed' };
};

export const isBookmarked = async (book, chapter, verse) => {
    const result = await getBookmarkForVerse(book, chapter, verse);
    return !!result;
};

export const getBookmarkForVerse = async (book, chapter, verse) => {
    const prefix = `${book}/${chapter}`;
    // Use IDBKeyRange to only fetch bookmarks for this chapter
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const bookmarks = await IndexedDBService.getAll(STORES.BOOKMARKS, range);

    return bookmarks.find(b => {
        // extra check for prefix in case range semantics are tricky (though they shouldn't be)
        if (!b.id.startsWith(prefix)) return false;
        if (b.v && Array.isArray(b.v)) {
            return b.v.includes(verse);
        }
        return false;
    });
};

// Get ALL bookmarks that contain a specific verse (for overlapping bookmarks)
export const getBookmarksForVerse = async (book, chapter, verse) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const bookmarks = await IndexedDBService.getAll(STORES.BOOKMARKS, range);

    return bookmarks.filter(b => {
        if (!b.id.startsWith(prefix)) return false;
        if (b.v && Array.isArray(b.v)) {
            return b.v.includes(verse);
        }
        return false;
    });
};

// Get ALL bookmarks for a specific chapter
export const getBookmarksForChapter = async (book, chapter) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    return await IndexedDBService.getAll(STORES.BOOKMARKS, range);
};

// Helper to get book/chapter from bookmark
export const getBookmarkDetails = (bookmark) => {
    const parsed = parseVerseId(bookmark.id);
    return {
        ...parsed,
        verses: bookmark.v || parsed.verses,
        createdAt: bookmark.c
    };
};

// ========== NOTES ==========
// Compact format: { id: "book/chapter:verses", v: [1,2,3], n: "note content", u: "..." }

export const getNotes = async () => {
    return await IndexedDBService.getAll(STORES.NOTES);
};

export const countNotes = async () => {
    return await IndexedDBService.count(STORES.NOTES);
};

export const addNote = async (book, chapter, startVerse, endVerse, noteContent, selectedVerses = null) => {
    let verses;
    if (selectedVerses && Array.isArray(selectedVerses)) {
        verses = [...selectedVerses].sort((a, b) => a - b);
    } else {
        verses = [];
        for (let v = startVerse; v <= (endVerse || startVerse); v++) {
            verses.push(v);
        }
    }

    const id = generateVerseId(book, chapter, verses);
    const now = new Date().toISOString();

    const existing = await IndexedDBService.get(STORES.NOTES, id);
    let note;

    if (existing) {
        note = {
            ...existing,
            n: noteContent,
            v: verses,
            u: now
        };
    } else {
        note = {
            id,
            v: verses,
            n: noteContent,
            u: now,
        };
    }

    await IndexedDBService.put(STORES.NOTES, note);
    notifyChange();
    return { success: true, message: 'Note saved' };
};

export const removeNote = async (id) => {
    await IndexedDBService.delete(STORES.NOTES, id);
    notifyChange();
    return { success: true, message: 'Note removed' };
};

export const getNoteForVerse = async (book, chapter, verse) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const notes = await IndexedDBService.getAll(STORES.NOTES, range);

    return notes.find(n => {
        if (!n.id.startsWith(prefix)) return false;
        if (n.v && Array.isArray(n.v)) {
            return n.v.includes(verse);
        }
        return false;
    });
};

// Get ALL notes that contain a specific verse (for overlapping notes)
export const getNotesForVerse = async (book, chapter, verse) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const notes = await IndexedDBService.getAll(STORES.NOTES, range);

    return notes.filter(n => {
        if (!n.id.startsWith(prefix)) return false;
        if (n.v && Array.isArray(n.v)) {
            return n.v.includes(verse);
        }
        return false;
    });
};

// Get ALL notes for a specific chapter
export const getNotesForChapter = async (book, chapter) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    return await IndexedDBService.getAll(STORES.NOTES, range);
};

// Helper to get note details
export const getNoteDetails = (note) => {
    const parsed = parseVerseId(note.id);
    return {
        ...parsed,
        verses: note.v || parsed.verses,
        noteContent: note.n,
        updatedAt: note.u
    };
};

// ========== HIGHLIGHTS ==========
// Compact format: { id: "book/chapter:verses", v: [1,2,3], h: "#fff59d", u: "..." }

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', value: '#fff59d' },
    { name: 'Green', value: '#a5d6a7' },
    { name: 'Blue', value: '#90caf9' },
    { name: 'Pink', value: '#f48fb1' },
    { name: 'Orange', value: '#ffcc80' },
    { name: 'Purple', value: '#ce93d8' },
];

export const getHighlightColors = () => HIGHLIGHT_COLORS;

export const getHighlights = async () => {
    return await IndexedDBService.getAll(STORES.HIGHLIGHTS);
};

export const countHighlights = async () => {
    return await IndexedDBService.count(STORES.HIGHLIGHTS);
};

export const addHighlight = async (book, chapter, startVerse, endVerse, color = '#fff59d', selectedVerses = null) => {
    let verses;
    if (selectedVerses && Array.isArray(selectedVerses)) {
        verses = [...selectedVerses].sort((a, b) => a - b);
    } else {
        verses = [];
        for (let v = startVerse; v <= (endVerse || startVerse); v++) {
            verses.push(v);
        }
    }

    const id = generateVerseId(book, chapter, verses);
    const now = new Date().toISOString();

    const existing = await IndexedDBService.get(STORES.HIGHLIGHTS, id);
    let highlight;

    if (existing) {
        highlight = {
            ...existing,
            h: color,
            v: verses,
            u: now
        };
    } else {
        highlight = {
            id,
            v: verses,
            h: color,
            u: now,
        };
    }

    await IndexedDBService.put(STORES.HIGHLIGHTS, highlight);
    notifyChange();
    return { success: true, message: 'Highlight added' };
};

export const removeHighlight = async (id) => {
    await IndexedDBService.delete(STORES.HIGHLIGHTS, id);
    notifyChange();
    return { success: true, message: 'Highlight removed' };
};

export const getHighlightForVerse = async (book, chapter, verse) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const highlights = await IndexedDBService.getAll(STORES.HIGHLIGHTS, range);

    return highlights.find(h => {
        if (!h.id.startsWith(prefix)) return false;
        if (h.v && Array.isArray(h.v)) {
            return h.v.includes(verse);
        }
        return false;
    });
};

// Get ALL highlights for a specific chapter
export const getHighlightsForChapter = async (book, chapter) => {
    const prefix = `${book}/${chapter}`;
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    return await IndexedDBService.getAll(STORES.HIGHLIGHTS, range);
};

// Helper to get highlight details
export const getHighlightDetails = (highlight) => {
    const parsed = parseVerseId(highlight.id);
    return {
        ...parsed,
        verses: highlight.v || parsed.verses,
        color: highlight.h,
        updatedAt: highlight.u
    };
};

// ========== HISTORY ==========
// Compact format: { id: "book/chapter" or "book/chapter:verse", t: "2024-01-10T..." }

const MAX_HISTORY_ITEMS = 10000;

export const getHistory = async (limit = null, offset = 0) => {
    // If no limit, use getAll (slower if very large) but reversed
    if (!limit) {
        const history = await IndexedDBService.getAll(STORES.HISTORY);
        return history.reverse();
    }

    // Optimized paged fetch using cursor
    // We want newest first, so we use 'prev' direction on the timestamp index
    const db = await IndexedDBService.openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HISTORY, 'readonly');
        const store = transaction.objectStore(STORES.HISTORY);

        let request;
        // Ensure index exists (it should with v2)
        if (store.indexNames.contains('timestamp')) {
            const index = store.index('timestamp');
            request = index.openCursor(null, 'prev'); // 'prev' = newest first
        } else {
            // Fallback if index missing (shouldn't happen)
            request = store.openCursor(null, 'prev');
        }

        const results = [];
        let hasSkipped = false;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve(results);
                return;
            }

            if (offset > 0 && !hasSkipped) {
                hasSkipped = true;
                cursor.advance(offset);
                return;
            }

            results.push(cursor.value);

            if (results.length < limit) {
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = () => reject(request.error);
    });
};

export const countHistory = async () => {
    return await IndexedDBService.count(STORES.HISTORY);
};

export const addToHistory = async (book, chapter, verse = null, endVerse = null) => {
    const id = generateHistoryId(book, chapter, verse, endVerse);
    const item = {
        id,
        t: new Date().toISOString(),
    };

    // Add or update (put handles both)
    await IndexedDBService.put(STORES.HISTORY, item);

    // Efficiently enforce limit without loading all items
    const count = await countHistory();
    if (count > MAX_HISTORY_ITEMS) {
        const excess = count - MAX_HISTORY_ITEMS;
        try {
            // Get oldest IDs using the timestamp index
            const keysToDelete = await IndexedDBService.getOldestKeys(STORES.HISTORY, 'timestamp', excess);

            // Delete oldest items
            for (const key of keysToDelete) {
                await IndexedDBService.delete(STORES.HISTORY, key);
            }
        } catch (error) {
            console.error('Failed to prune history:', error);
            // Fallback: redundant if index exists, but safe to ignore as it just means history grows slightly larger temporarily
        }
    }

    notifyChange();
    return { success: true };
};

// Helper to get history item details
export const getHistoryDetails = (historyItem) => {
    const id = historyItem.id;
    const [bookChapter, versePart] = id.split(':');
    const [book, chapter] = bookChapter.split('/').map(Number);

    let verse = null;
    let startVerse = null;
    let endVerse = null;

    if (versePart) {
        if (versePart.includes('-')) {
            // Verse range: "1-4"
            const [start, end] = versePart.split('-').map(Number);
            startVerse = start;
            endVerse = end;
            verse = startVerse; // For backward compatibility
        } else {
            // Single verse: "1"
            verse = parseInt(versePart);
            startVerse = verse;
            endVerse = verse;
        }
    }

    return {
        book,
        chapter,
        verse,
        startVerse,
        endVerse,
        viewedAt: historyItem.t
    };
};

export const clearHistory = async () => {
    await IndexedDBService.clear(STORES.HISTORY);
    notifyChange();
    return { success: true, message: 'History cleared' };
};

// ========== UTILITY FUNCTIONS ==========

export const clearAllNotes = async () => {
    await IndexedDBService.clear(STORES.NOTES);
    notifyChange();
    return { success: true, message: 'All notes cleared' };
};

export const clearAllHighlights = async () => {
    await IndexedDBService.clear(STORES.HIGHLIGHTS);
    notifyChange();
    return { success: true, message: 'All highlights cleared' };
};

export const clearAllBookmarks = async () => {
    await IndexedDBService.clear(STORES.BOOKMARKS);
    notifyChange();
    return { success: true, message: 'All bookmarks cleared' };
};

export const clearAllData = async () => {
    await Promise.all([
        IndexedDBService.clear(STORES.BOOKMARKS),
        IndexedDBService.clear(STORES.NOTES),
        IndexedDBService.clear(STORES.HIGHLIGHTS),
        IndexedDBService.clear(STORES.HISTORY)
    ]);
    notifyChange();
    return { success: true, message: 'All data cleared' };
};

export const copyVerseText = async (text, reference) => {
    try {
        const copyText = `${text}\n\n${reference}`;
        await navigator.clipboard.writeText(copyText);
        return { success: true, message: 'Copied to clipboard' };
    } catch (err) {
        console.error('Failed to copy:', err);
        return { success: false, message: 'Failed to copy' };
    }
};
