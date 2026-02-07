import { useState, useRef, useEffect } from 'react';

import {
    copyVerseText,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getNoteForVerse,
    addHighlight,
    getHighlightForVerse,
    removeHighlight,
    getHighlightColors,
    generateVerseId,
    onVerseStorageChange,
} from '../config/VerseStorage';

/**
 * VerseActionToolbar - Floating action bar for verse operations
 * Shows when verses are selected, allows: Copy, Bookmark, Note, Highlight
 */
function VerseActionToolbar({
    selectedVerses = [],
    book,
    chapter,
    chapterName,
    bibleData,
    onClose,
    onActionComplete,
    onOpenNote,  // New callback to open note popover
    onToggleReferences,  // Callback to toggle references for selected verses
    hasReferencesShown = false,  // Whether any selected verse has references shown
    globalRefsEnabled = false,  // Whether global show references is ON
    explicitVerses = null
}) {
    const [showHighlightModal, setShowHighlightModal] = useState(false);
    const [actionFeedback, setActionFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState('success');
    const [isCopied, setIsCopied] = useState(false);
    const toolbarRef = useRef(null);

    // Get the selected verses data
    const getSelectedVersesData = () => {
        let verses = [];

        if (explicitVerses) {
            verses = [...explicitVerses].sort((a, b) => {
                if (Number(a.b) !== Number(b.b)) return Number(a.b) - Number(b.b);
                if (Number(a.c) !== Number(b.c)) return Number(a.c) - Number(b.c);
                return Number(a.v) - Number(b.v);
            });
        } else {
            if (!bibleData || selectedVerses.length === 0) return { text: '', reference: '', verses: [] };
            const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
            verses = bibleData.filter(v =>
                Number(v.b) == book &&
                Number(v.c) == chapter &&
                sortedVerses.includes(Number(v.v))
            ).sort((a, b) => a.v - b.v);
        }

        if (verses.length === 0) return { text: '', reference: '', verses: [] };

        const text = verses.map(v => `${v.v}. ${v.t}`).join('\n');

        let reference = '';
        if (explicitVerses) {
            // Group by Book and Chapter
            const groups = [];
            let currentGroup = [];
            verses.forEach((v, i) => {
                const prev = i > 0 ? verses[i - 1] : null;
                if (prev && (prev.b != v.b || prev.c != v.c)) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                currentGroup.push(v);
            });
            if (currentGroup.length) groups.push(currentGroup);

            reference = groups.map(group => {
                const bName = group[0].bookName || `Book ${group[0].b}`;
                const cNum = group[0].c;
                const vNums = group.map(g => Number(g.v));

                const ranges = [];
                let start = vNums[0];
                let prev = start;
                for (let k = 1; k < vNums.length; k++) {
                    if (vNums[k] === prev + 1) prev = vNums[k];
                    else {
                        ranges.push(start === prev ? start : `${start}-${prev}`);
                        start = vNums[k];
                        prev = vNums[k];
                    }
                }
                ranges.push(start === prev ? start : `${start}-${prev}`);
                return `${bName} ${cNum}:${ranges.join(',')}`;
            }).join('; ');

        } else {
            // Standard single chapter logic
            const vNums = verses.map(v => Number(v.v));
            const ranges = [];
            let start = vNums[0];
            let prev = start;
            for (let k = 1; k < vNums.length; k++) {
                if (vNums[k] === prev + 1) prev = vNums[k];
                else {
                    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                    start = vNums[k];
                    prev = vNums[k];
                }
            }
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            reference = `${chapterName} ${chapter}:${ranges.join(',')}`;
        }

        return { text, reference, startVerse: verses[0].v, endVerse: verses[verses.length - 1].v, verses };
    };



    const showFeedback = (message, type = 'success') => {
        setActionFeedback(message);
        setFeedbackType(type);
        setTimeout(() => setActionFeedback(''), 2000);
    };

    // Copy action
    const handleCopy = async () => {
        const { verses } = getSelectedVersesData();

        if (!verses || verses.length === 0) return;

        // 1. Group by Book, Chapter AND Continuity (adjacent verses)
        const groups = [];
        let currentGroup = [];

        verses.forEach((verse, index) => {
            const prev = index > 0 ? verses[index - 1] : null;
            // A verse belongs to the current group if it's the first verse, 
            // or if it's in the same book/chapter AND is the next sequential verse.
            const isSameContext = prev && (Number(prev.b) === Number(verse.b) && Number(prev.c) === Number(verse.c));
            const isAdjacent = prev && (Number(prev.v) + 1 === Number(verse.v));

            if (index === 0 || (isSameContext && isAdjacent)) {
                currentGroup.push(verse);
            } else {
                groups.push(currentGroup);
                currentGroup = [verse];
            }
        });
        if (currentGroup.length > 0) groups.push(currentGroup);

        // 2. Format each group as "Text\n(Reference)"
        const formattedBlocks = groups.map(group => {
            // Text: join text of all verses in the group without verse numbers
            const text = group.map(v => v.t).join(' ');

            // Reference: Book Chapter:VerseRange
            const first = group[0];
            const last = group[group.length - 1];

            // Try to get book name from verse object (Search) or from component props (Content)
            const bName = first.bookName || chapterName || `Book ${first.b}`;
            const cNum = first.c;
            const vRange = first.v === last.v ? `${first.v}` : `${first.v}-${last.v}`;

            const groupRef = `${bName} ${cNum}:${vRange}`;

            return `${text}\n(${groupRef})`;
        });

        // Join all blocks with double newline for clear separation
        const finalString = formattedBlocks.join('\n\n');

        try {
            await navigator.clipboard.writeText(finalString);
            setIsCopied(true);
            setTimeout(() => {
                onActionComplete?.();
                setIsCopied(false);
            }, 1000);
        } catch (err) {
            showFeedback('Failed to copy', 'error');
        }
    };


    // Bookmark action
    const handleBookmark = async () => {
        if (explicitVerses) {
            showFeedback('Bookmarks disabled in search page', 'error');
            return;
        }

        const { text, reference, startVerse, endVerse } = getSelectedVersesData();

        // Check if already bookmarked using state
        if (hasBookmark) {
            // Remove bookmark
            const id = generateVerseId(book, chapter, selectedVerses);
            await removeBookmark(id);
            showFeedback('Bookmark removed', 'success');
        } else {
            const result = await addBookmark(book, chapter, startVerse, endVerse, selectedVerses);
            showFeedback(result.message, result.success ? 'success' : 'warning');
        }
        await checkStatuses(); // Refresh status
        onActionComplete?.();
    };

    // Note action - use callback to open note popover
    const handleOpenNote = async () => {
        if (explicitVerses) {
            showFeedback('Notes disabled in search page', 'error');
            return;
        }

        const { text, reference, startVerse, endVerse } = getSelectedVersesData();
        const existingNote = await getNoteForVerse(book, chapter, selectedVerses[0]);

        onOpenNote?.({
            verseNum: startVerse,
            note: existingNote || {
                id: generateVerseId(book, chapter, selectedVerses),
                v: [...selectedVerses],  // Use compact 'v' for verses array
                n: '',  // Use compact 'n' for note content
            },
            isNew: !existingNote,
            selectedVerses: [...selectedVerses],  // Pass to popover
        });
    };

    // Highlight handlers
    const handleHighlight = async (color) => {
        if (explicitVerses) {
            showFeedback('Highlights disabled in search page', 'error');
            return;
        }

        const { startVerse, endVerse } = getSelectedVersesData();
        const result = await addHighlight(book, chapter, startVerse, endVerse, color, selectedVerses);
        showFeedback(result.message, result.success ? 'success' : 'error');
        setShowHighlightModal(false);
        await checkStatuses(); // Refresh status
        onActionComplete?.();
    };

    const handleRemoveHighlight = async () => {
        if (explicitVerses) {
            showFeedback('Highlights disabled in search page', 'error');
            return;
        }

        // Find highlights associated with selected verses
        const highlightsToRemove = new Set();
        for (const v of selectedVerses) {
            const h = await getHighlightForVerse(book, chapter, v);
            if (h) highlightsToRemove.add(h.id);
        }

        if (highlightsToRemove.size > 0) {
            for (const id of highlightsToRemove) {
                await removeHighlight(id);
            }
            showFeedback('Highlight removed', 'success');
        }

        setShowHighlightModal(false);
        await checkStatuses(); // Refresh status
        onActionComplete?.();
    };

    // Async check states for icons
    const [hasBookmark, setHasBookmark] = useState(false);
    const [hasNote, setHasNote] = useState(false);
    const [hasHighlight, setHasHighlight] = useState(false);

    const checkStatuses = async () => {
        let bMark = false;
        let note = false;
        let highlight = false;

        if (explicitVerses) {
            // Optimization: Buttons are hidden in search mode, so no need to check status
            setHasBookmark(false);
            setHasNote(false);
            setHasHighlight(false);
            return;
        }

        if (selectedVerses && selectedVerses.length > 0) {
            for (const v of selectedVerses) {
                if (!bMark && await isBookmarked(book, chapter, v)) bMark = true;
                if (!note && await getNoteForVerse(book, chapter, v)) note = true;
                if (!highlight && await getHighlightForVerse(book, chapter, v)) highlight = true;
            }
        }
        setHasBookmark(bMark);
        setHasNote(note);
        setHasHighlight(highlight);
    };

    useEffect(() => {
        checkStatuses();

        // Subscribe to external changes (e.g. if bookmark removed from modal while toolbar is open)
        const unsubscribe = onVerseStorageChange(() => {
            checkStatuses();
        });

        return () => unsubscribe();
    }, [selectedVerses, explicitVerses, book, chapter]);


    if ((!selectedVerses || selectedVerses.length === 0) && (!explicitVerses || explicitVerses.length === 0)) return null;

    const count = explicitVerses ? explicitVerses.length : selectedVerses.length;

    const handleToggleRefs = () => {
        if (onToggleReferences) {
            onToggleReferences([...selectedVerses]);
        }
    };

    return (
        <>
            {/* Outer Wrapper for mobile close button positioning */}
            <div className="toolbar-wrapper" style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1050,
            }}>
                {/* Mobile Close Button - Only shown when refs button is present (more crowded toolbar) */}
                {!globalRefsEnabled && (
                    <button
                        onClick={onClose}
                        className="mobile-close-btn"
                        title="Clear Selection"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                        </svg>
                    </button>
                )}

                {/* Floating Toolbar */}
                <div
                    ref={toolbarRef}
                    className="verse-action-toolbar"
                    style={{
                        backgroundColor: 'rgba(var(--bs-body-bg-rgb, 33, 37, 41), 0.8)',
                        borderRadius: '24px',
                        padding: '12px 18px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.05)',
                    }}
                >
                    {/* Selection count */}
                    <div
                        className="selection-indicator"
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            padding: '8px 14px',
                            borderRadius: '16px',
                            background: 'rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.1)',
                            border: '1px solid rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.15)',
                            color: 'var(--bs-body-color, #fff)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <div className="pulse-dot"></div>
                        {count} {count === 1 ? 'verse' : 'verses'}
                    </div>

                    {/* Vertical Divider */}
                    <div style={{ height: '30px', width: '1px', background: 'rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.15)', margin: '0 4px' }}></div>

                    {/* Action Buttons */}
                    <div className="toolbar-actions" style={{ display: 'flex', gap: '10px' }}>
                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            className={`premium-action-btn copy-btn ${isCopied ? 'active' : ''}`}
                            title="Copy"
                        >
                            {isCopied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                                </svg>
                            )}
                            <span className="btn-text">{isCopied ? 'Copied!' : 'Copy'}</span>
                        </button>

                        {/* Bookmark */}
                        {!explicitVerses && (
                            <button
                                onClick={handleBookmark}
                                className={`premium-action-btn bookmark-btn ${hasBookmark ? 'active' : ''}`}
                                title={hasBookmark ? 'Remove Bookmark' : 'Add Bookmark'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    {hasBookmark ? (
                                        <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                                    ) : (
                                        <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z" />
                                    )}
                                </svg>
                                <span className="btn-text">Bookmark</span>
                            </button>
                        )}

                        {/* Note */}
                        {!explicitVerses && (
                            <button
                                onClick={handleOpenNote}
                                className={`premium-action-btn note-btn ${hasNote ? 'active' : ''}`}
                                title={hasNote ? 'Edit Note' : 'Add Note'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z" />
                                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
                                </svg>
                                <span className="btn-text">Note</span>
                            </button>
                        )}

                        {!explicitVerses && (
                            <button
                                onClick={() => {
                                    if (explicitVerses) {
                                        showFeedback('Highlights disabled in search page', 'error');
                                    } else {
                                        setShowHighlightModal(true);
                                    }
                                }}
                                className={`premium-action-btn highlight-btn ${hasHighlight ? 'active' : ''}`}
                                title="Highlight"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M11.096.644a2 2 0 0 1 2.791.036l1.433 1.433a2 2 0 0 1 .035 2.791l-.413.435-8.07 8.995a.5.5 0 0 1-.372.166h-3a.5.5 0 0 1-.234-.058l-.412.412a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 0-.708l.412-.411A.5.5 0 0 1 1.5 12.5v-3a.5.5 0 0 1 .166-.372l8.995-8.07.435-.414Zm-.115 1.47L2.727 9.52l3.753 3.753 7.406-8.254-2.905-2.906Z" />
                                    <path d="M3.5 12.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1a.5.5 0 0 1 .5-.5Z" />
                                </svg>
                                <span className="btn-text">Highlight</span>
                            </button>
                        )}

                        {/* References Toggle - Only show when global refs is OFF */}
                        {!explicitVerses && !globalRefsEnabled && (
                            <button
                                onClick={handleToggleRefs}
                                className={`premium-action-btn refs-btn ${hasReferencesShown ? 'active' : ''}`}
                                title={hasReferencesShown ? 'Hide References' : 'Show References'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.001 1.001 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
                                    <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
                                </svg>
                                <span className="btn-text">{hasReferencesShown ? 'Hide Refs' : 'Show Refs'}</span>
                            </button>
                        )}

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="premium-action-btn close-btn"
                            title="Clear Selection"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                            </svg>
                        </button>
                    </div>

                    {/* Feedback Toast */}
                    {actionFeedback && (
                        <div
                            className={`premium-feedback-toast ${feedbackType}`}
                        >
                            {feedbackType === 'success' ? '✨' : feedbackType === 'error' ? '❌' : '⚠️'}
                            <span>{actionFeedback}</span>
                        </div>
                    )}
                </div>
            </div>  {/* End toolbar-wrapper */}

            {/* Highlight Color Modal - Outside wrapper to prevent clipping */}
            {showHighlightModal && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowHighlightModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            zIndex: 1055,
                            backdropFilter: 'blur(2px)',
                        }}
                    />

                    {/* Custom Modal */}
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(28, 28, 45, 0.85)',
                        borderRadius: '24px',
                        padding: '0',
                        width: '320px',
                        maxWidth: '90vw',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        zIndex: 1060,
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.03)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🎨</span>
                                <strong style={{ letterSpacing: '0.5px' }}>Highlight Verse</strong>
                            </div>
                            <button
                                onClick={() => setShowHighlightModal(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: 'white',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >×</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                                {getHighlightColors().map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => handleHighlight(color.value)}
                                        title={color.name}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            backgroundColor: color.value,
                                            borderRadius: '50%',
                                            border: '3px solid rgba(0,0,0,0.2)',
                                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                            padding: 0,
                                            cursor: 'pointer'
                                        }}
                                        className="h-color-dot"
                                    />
                                ))}
                            </div>

                            {hasHighlight && (
                                <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button
                                        onClick={handleRemoveHighlight}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#f87171',
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            width: '100%',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Remove Highlight
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .premium-action-btn {
          background: rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.05);
          border: 1px solid rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.1);
          color: rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.8);
          border-radius: 16px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          white-space: nowrap;
        }

        .premium-action-btn:hover {
          background: rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.12);
          transform: translateY(-4px);
          color: var(--bs-body-color, white);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          border-color: rgba(var(--bs-body-color-rgb, 255, 255, 255), 0.2);
        }

        .premium-action-btn:active {
          transform: translateY(-1px);
        }

        .premium-action-btn.active.bookmark-btn {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
          color: #1e293b !important;
          border-color: rgba(251, 191, 36, 0.5);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
        }

        .premium-action-btn.active.note-btn {
          background: linear-gradient(135deg, #8D9EFF 0%, #6366f1 100%) !important;
          color: white !important;
          border-color: rgba(141, 158, 255, 0.5);
          box-shadow: 0 0 20px rgba(141, 158, 255, 0.35);
        }

        .premium-action-btn.active.highlight-btn {
          background: linear-gradient(135deg, #34d399 0%, #059669 100%) !important;
          color: white !important;
          border-color: rgba(52, 211, 153, 0.5);
          box-shadow: 0 0 20px rgba(5, 150, 105, 0.35);
        }

        .premium-action-btn.active.copy-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: white !important;
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 20px rgba(5, 150, 105, 0.35);
        }

        .premium-action-btn.active.refs-btn {
          background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%) !important;
          color: white !important;
          border-color: rgba(167, 139, 250, 0.5);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.35);
        }

        .premium-action-btn.close-btn {
          background: transparent;
          border-color: transparent;
          color: #f87171;
          padding: 8px;
        }

        .premium-action-btn.close-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          transform: rotate(90deg) scale(1.1);
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8D9EFF;
          box-shadow: 0 0 10px #8D9EFF;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(141, 158, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(141, 158, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(141, 158, 255, 0); }
        }

        .premium-feedback-toast {
          position: absolute;
          top: -65px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 14px;
          animation: fadeInUpFeedback 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          white-space: nowrap;
          z-index: 1100;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .premium-feedback-toast.success { background: rgba(16, 185, 129, 0.9); color: white; }
        .premium-feedback-toast.error { background: rgba(239, 68, 68, 0.9); color: white; }
        .premium-feedback-toast.warning { background: rgba(245, 158, 11, 0.9); color: white; }

        @keyframes fadeInUpFeedback {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.8); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        .h-color-dot:hover {
          transform: scale(1.2) !important;
          z-index: 10;
        }

        @media (max-width: 768px) {
          .btn-text { display: none; }
          .premium-action-btn { padding: 6px 8px !important; }
          .verse-action-toolbar { 
            gap: 6px !important; 
            padding: 8px 8px !important; 
            border-radius: 14px !important;
            max-width: 92vw !important;
            width: max-content !important;
            overflow-x: auto !important;
            justify-content: flex-start !important; /* Ensure content starts from left if scrolling */
            /* Hide scrollbar for Chrome, Safari and Opera */
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
          }
          .verse-action-toolbar::-webkit-scrollbar {
            display: none;
          }
          .selection-indicator { padding: 5px 10px !important; font-size: 0.75rem !important; flex-shrink: 0; }
          .premium-action-btn svg { width: 16px; height: 16px; min-width: 16px; }
          .premium-action-btn { padding: 6px 8px !important; flex-shrink: 0; }
          /* Hide inline close when mobile close button is present */
          .toolbar-wrapper:has(.mobile-close-btn) .premium-action-btn.close-btn { display: none !important; }
        }

        /* Toolbar wrapper for mobile close button positioning */
        .toolbar-wrapper {
          position: relative;
        }

        /* Mobile close button - hidden on desktop, shown on mobile */
        .mobile-close-btn {
          display: none;
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
          z-index: 10;
        }

        @media (max-width: 768px) {
          .mobile-close-btn { display: flex; }
        }

        .mobile-close-btn svg {
          width: 10px;
          height: 10px;
        }

        .mobile-close-btn:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.1);
        }
      `}</style >
        </>
    );
}

export default VerseActionToolbar;
