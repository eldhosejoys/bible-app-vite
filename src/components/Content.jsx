import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, React, Fragment } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import { getTranslation } from '../config/SiteTranslations';
import { getCacheData, addDataIntoCache, getLanguage, areReferencesEnabled, formatVerseRange } from '../config/Utils';
import {
  getHighlightForVerse,
  getNoteForVerse,
  getNotesForVerse,
  isBookmarked,
  getBookmarkForVerse,
  getBookmarksForVerse,
  removeBookmark,
  addToHistory,
  addNote,
  removeNote,
  parseVerseId,
  getBookmarksForChapter,
  getNotesForChapter,
  getHighlightsForChapter,
  onVerseStorageChange,
} from '../config/VerseStorage';
import { getCrossReferencesForBook } from '../config/CrossReferenceLoader';
import CrossReferenceVerse from "./CrossReferenceVerse";
import VerseActionToolbar from "./VerseActionToolbar";
import GlobalNoteTooltip from "./GlobalNoteTooltip";
import NoteEditor from "./NoteEditor";
import './Content.css';

// Helper function to parse verse parameter like "4" or "4-7"
function parseVerseRange(verseParam) {
  if (!verseParam) return [];
  const parts = verseParam.split('-').map(Number);
  if (parts.length === 1 && !isNaN(parts[0])) {
    return [parts[0], parts[0]]; // It's a single verse
  }
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] <= parts[1]) {
    return [parts[0], parts[1]]; // It's a valid range
  }
  return []; // Invalid format
}

function Content({ book, chapter, verse }) {
  let params = { book, chapter, verse };
  const location = useLocation();
  const navigate = useNavigate();

  // --- STATE ---
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const [chaptername, setChaptername] = useState("");
  const [activeCrossReference, setActiveCrossReference] = useState({});
  const [expandedReferences, setExpandedReferences] = useState({});
  const [verseReferencesToggledOn, setVerseReferencesToggledOn] = useState(new Set()); // Verses with references explicitly toggled ON (only used when global is OFF)
  const [bibleData, setBibleData] = useState(null);
  const [titlesData, setTitlesData] = useState(null);
  const [headingsData, setHeadingsData] = useState(null);
  const [crossRefData, setCrossRefData] = useState(null);
  const [introData, setIntroData] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'light');

  // Selection state for multi-verse actions
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Note popover state (for editing)
  const [activeNotePopover, setActiveNotePopover] = useState(null); // { verseNum, note }
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Note tooltip state (for quick preview - rendered at top level)
  const [hoverNoteTooltip, setHoverNoteTooltip] = useState(null); // { note, x, y }

  const [chapterUserData, setChapterUserData] = useState({ bookmarks: [], notes: [], highlights: [] });
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [settingsTick, setSettingsTick] = useState(0);

  const itemsRef = useRef([]);
  const itemsRef2 = useRef([]);
  const itemsRef3 = useRef([]);
  const highlightedElementsRef = useRef({ verse: null, button: null, timer: null });
  const tooltipTimeoutRef = useRef(null);
  const lastScrolledKeyRef = useRef(null);

  // Fetch user data (bookmarks, notes, highlights)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!params.book || !params.chapter) return;
      try {
        const [bookmarks, notes, highlights] = await Promise.all([
          getBookmarksForChapter(params.book, params.chapter),
          getNotesForChapter(params.book, params.chapter),
          getHighlightsForChapter(params.book, params.chapter)
        ]);
        setChapterUserData({ bookmarks, notes, highlights });
      } catch (e) {
        console.error("Error fetching user data", e);
      } finally {
        setIsUserDataLoaded(true);
      }
    };

    // Initial fetch
    fetchUserData();

    // Subscribe to global storage updates (added/removed bookmarks etc from other components)
    const unsubscribe = onVerseStorageChange(() => {
      fetchUserData();
    });

    return () => unsubscribe();
  }, [params.book, params.chapter, refreshKey]);

  // Listen for theme changes (optional but good for consistency without reload)
  useEffect(() => {
    const handleThemeChange = () => {
      const theme = localStorage.getItem('theme') || 'light';
      setCurrentTheme(theme);
    };

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleThemeChange);

    // Also check on interval or custom event if needed, but for now assuming reload or storage event
    // Ideally, we'd use a Context for theme, but for this quick fix:
    // We can also poll or hook into the Settings change if possible.
    // For now, let's just expose a global event or something? 
    // Actually, local storage updates in the same tab DON'T fire 'storage' event.
    // So we'll add a custom event listener 'themeChange'.
    window.addEventListener('themeChange', handleThemeChange);

    const handleSettingsChange = () => {
      setSettingsTick(t => t + 1);
    };
    window.addEventListener('settingsChange', handleSettingsChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
    };
  }, []);


  const handleCrossReferenceClick = (crossRefData, verseIndex) => {
    setActiveCrossReference(prev => {
      const isAlreadyActive = prev.verseIndex === verseIndex && prev.refData === crossRefData;
      return isAlreadyActive ? {} : { verseIndex, refData: crossRefData };
    });
  };

  // Toggle verse selection
  const handleVerseSelect = (verseNum) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) {
        const newSelection = prev.filter(v => v !== verseNum);
        if (newSelection.length === 0) {
          setIsSelectionMode(false);
        }
        return newSelection;
      } else {
        setIsSelectionMode(true);
        return [...prev, verseNum].sort((a, b) => a - b);
      }
    });
  };

  // Toggle selection for a range of verses (for grouped cards)
  const handleVerseSelectRange = (start, end) => {
    const range = [];
    for (let i = Number(start); i <= Number(end); i++) range.push(i);

    setSelectedVerses(prev => {
      const allSelected = range.every(v => prev.includes(v));
      let newSelection;
      if (allSelected) {
        // Deselect all
        newSelection = prev.filter(v => !range.includes(v));
      } else {
        // Select all (merge)
        newSelection = [...new Set([...prev, ...range])].sort((a, b) => a - b);
      }

      setIsSelectionMode(newSelection.length > 0);
      return newSelection;
    });
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedVerses([]);
    setIsSelectionMode(false);
  };

  // Handle action complete - refresh highlights, etc.
  const handleActionComplete = () => {
    setRefreshKey(prev => prev + 1);
    handleClearSelection();
  };

  // Handle toggling references for selected verses
  // This only works when global refs is OFF - toggling shows refs for specific verses
  const handleToggleReferences = (verses) => {
    setVerseReferencesToggledOn(prev => {
      const updated = new Set(prev);

      // Check if any selected verses currently have refs shown
      const anyShowing = verses.some(v => updated.has(v));

      verses.forEach(v => {
        if (anyShowing) {
          // Hide - remove from toggled on set
          updated.delete(v);
        } else {
          // Show - add to toggled on set
          updated.add(v);
        }
      });

      return updated;
    });
  };

  // Check if references should be shown for a specific verse
  const shouldShowReferencesForVerse = (verseNum) => {
    const globalEnabled = areReferencesEnabled();
    // If global is ON, always show
    if (globalEnabled) return true;
    // If global is OFF, check if verse is explicitly toggled on
    return verseReferencesToggledOn.has(verseNum);
  };

  // Check if any of the selected verses currently have references shown
  const areReferencesShownForSelectedVerses = () => {
    if (selectedVerses.length === 0) return false;
    // When global is OFF, check if any selected verse has been toggled on
    return selectedVerses.some(v => verseReferencesToggledOn.has(v));
  };

  // Reset per-verse reference toggles when chapter/book changes
  useEffect(() => {
    setVerseReferencesToggledOn(new Set());
  }, [params.book, params.chapter]);

  // Handle opening note popover from toolbar
  const handleOpenNote = (noteData) => {
    setActiveNotePopover(noteData);
    setEditingNoteContent(noteData.note?.n || '');
    setIsEditingNote(true);
  };

  // Check if a verse is selected
  const isVerseSelected = (verseNum) => selectedVerses.includes(verseNum);


  // --- ASYNC HELPERS (Corrected) ---
  const getHeadings = async () => {
    if (siteConfig().headings.hasOwnProperty(params.book)) {
      const cached = await getCacheData('cache', siteConfig().headingurl);
      if (cached) return cached[params.book];
      try {
        const response = await axios.get(siteConfig().headingurl);
        addDataIntoCache('cache', siteConfig().headingurl, response.data);
        return response.data[params.book];
      } catch (error) { console.error("Failed to fetch headings:", error); return null; }
    }
    return null;
  };

  const getCrossRefs = async () => {
    // Always load cross-reference data so per-verse toggle can work
    // The display is controlled by shouldShowReferencesForVerse()
    return await getCrossReferencesForBook(params.book);
  };

  const getIntroInfos = async () => {
    const url = siteConfig().intro_url;
    const cached = await getCacheData('cache', url);
    if (cached) return cached;
    try {
      const response = await axios.get(url);
      addDataIntoCache('cache', url, response.data);
      return response.data;
    } catch (error) { console.error("Intro Infos fetch failed:", error); return null; }
  };

  const getAllTitles = async () => {
    const url = siteConfig().titleurl;
    const cached = await getCacheData('cache', url);
    if (cached) return cached;
    try {
      const response = await axios.get(url);
      addDataIntoCache('cache', url, response.data);
      return response.data;
    } catch (error) { console.error("Titles fetch failed:", error); return null; }
  };

  // --- DATA FETCHING EFFECT ---
  // --- DATA FETCHING EFFECT (Bible Text, Titles, etc) ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setCards([<div className="spinner-grow text-center" key="loading" role="status"><span className="visually-hidden">Loading...</span></div>]);

    // Reset all state on navigation
    setActiveCrossReference({});
    setBibleData(null);
    setIsUserDataLoaded(false); // Reset user data loaded flag on navigation
    setTitlesData(null);
    setHeadingsData(null);
    setCrossRefData(null);
    setIntroData(null);
    setSelectedVerses([]);
    setIsSelectionMode(false);
    itemsRef.current = [];
    itemsRef2.current = [];
    itemsRef3.current = [];

    const fetchData = async () => {
      try {
        const [titles, bible, headings, crossRefs, intros] = await Promise.all([
          getAllTitles(),
          getCacheData('cache', getBible()).then(cached => cached || axios.get(getBible()).then(res => res.data)),
          getHeadings(),
          getCrossRefs(),
          getIntroInfos()
        ]);

        if (titles) {
          titlenav(titles);
          setTitlesData(titles);
        }
        if (bible) {
          addDataIntoCache('cache', getBible(), bible);
          setBibleData(bible);
        }
        setHeadingsData(headings);
        setCrossRefData(crossRefs);
        setIntroData(intros);

      } catch (error) {
        console.error("Error fetching page data:", error);
      }
    };

    fetchData();
  }, [location, settingsTick]);

  // --- UI RENDERING HELPERS ---
  const renderCrossReferences = (references, verseIndex, verseNums = []) => {
    if (!references || references.length === 0) return null;

    // Check if any verse in this group should show references
    const shouldShow = verseNums.length > 0
      ? verseNums.some(v => shouldShowReferencesForVerse(v))
      : areReferencesEnabled();

    if (!shouldShow) return null;

    const sortedReferences = [...references].sort((a, b) => b.lyk - a.lyk);
    const isExpanded = expandedReferences[verseIndex];
    const referencesToShow = isExpanded ? sortedReferences : sortedReferences.slice(0, 5);

    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <div>
          {referencesToShow.map((cr, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                handleCrossReferenceClick(cr, verseIndex);
              }}
              className={`btn btn-sm ${activeCrossReference.verseIndex === verseIndex && activeCrossReference.refData === cr ? 'btn-primary' : 'btn-light'} rounded-pill me-2 mb-1`}
              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', lineHeight: '1.2' }}
            >
              {cr.to.length > 1 ? `${cr.to[0]}-${cr.to[1].split('/')[2]}` : cr.to[0]}
            </button>
          ))}
          {sortedReferences.length > 5 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedReferences(prev => ({ ...prev, [verseIndex]: !isExpanded }));
              }}
              className="btn btn-sm btn-secondary rounded-pill me-2 mb-1"
              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', lineHeight: '1.2' }}
            >
              {isExpanded ? '-' : '+'}
            </button>
          )}
        </div>
        {activeCrossReference.verseIndex === verseIndex && (
          <CrossReferenceVerse
            to={activeCrossReference.refData.to}
            fullBibleData={bibleData}
            titles={titlesData}
          />
        )}
      </div>
    );
  };

  const renderVerseIndicators = (verseNum, groupInfo = null) => {
    const indicators = [];

    // Get ALL bookmarks that contain this verse (from local state)
    const bookmarks = chapterUserData.bookmarks.filter(b => b.v && b.v.includes(verseNum));

    bookmarks.forEach((bookmark, idx) => {
      // Within a group, only show bookmark icon on the first verse of this bookmark that's visible in the group
      let shouldShowBookmark = true;
      if (groupInfo && groupInfo.groupVerses) {
        const bookmarkVerses = bookmark.v || [];
        // Find the first verse of this bookmark that's in the visible group
        const firstVisibleBookmarkVerse = groupInfo.groupVerses
          .filter(v => bookmarkVerses.includes(v))
          .sort((a, b) => a - b)[0];
        shouldShowBookmark = verseNum === firstVisibleBookmarkVerse;
      }

      if (shouldShowBookmark) {
        indicators.push(
          <span
            key={`bookmark-${bookmark.id}`}
            title="Remove Bookmark"
            className="note-indicator-icon"
            onClick={async (e) => {
              e.stopPropagation();
              await removeBookmark(bookmark.id);
              setRefreshKey(prev => prev + 1);
            }}
          >
            🔖
          </span>
        );
      }
    });

    // Get ALL notes that contain this verse (from local state)
    const notes = chapterUserData.notes.filter(n => n.v && n.v.includes(verseNum));

    notes.forEach((note, idx) => {
      // Within a group, only show note icon on the first verse of this note that's visible in the group
      let shouldShowNote = true;
      if (groupInfo && groupInfo.groupVerses) {
        const noteVerses = note.v || [];
        // Find the first verse of this note that's in the visible group
        const firstVisibleNoteVerse = groupInfo.groupVerses
          .filter(v => noteVerses.includes(v))
          .sort((a, b) => a - b)[0];
        shouldShowNote = verseNum === firstVisibleNoteVerse;
      }

      if (shouldShowNote) {
        indicators.push(
          <span
            key={`note-${note.id}`}
            className="note-indicator-icon"
            onClick={(e) => {
              e.stopPropagation();

              // Check if tooltip is already visible for this note
              if (hoverNoteTooltip && hoverNoteTooltip.note.id === note.id) {
                // Second click (or desktop click after hover) -> Open Editor
                setHoverNoteTooltip(null);
                const rect = e.currentTarget.getBoundingClientRect();

                setActiveNotePopover({
                  verseNum,
                  note,
                  isNew: false,
                  selectedVerses: note.v || [verseNum],
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 10,
                });

                setEditingNoteContent(note.n || '');
                setIsEditingNote(true);
              } else {
                // First click (Mobile) -> Show Tooltip
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverNoteTooltip({
                  note,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                  rect: rect
                });
              }
            }}
            onMouseEnter={(e) => {
              // Clear any pending timeout to hide
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
              }
              // Show global tooltip
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverNoteTooltip({
                note,
                x: rect.left + rect.width / 2,
                y: rect.top,
                rect: rect
              });
            }}
            onMouseLeave={() => {
              // Delay hiding to allow moving to the tooltip
              tooltipTimeoutRef.current = setTimeout(() => {
                setHoverNoteTooltip(null);
              }, 300);
            }}
            title="" // Remove default browser tooltip
          >
            📝
          </span>
        );
      }
    });

    if (indicators.length === 0) return null;

    return (
      <span className="verse-indicators-container">
        {indicators}
      </span>
    );
  };

  const getVerseHighlightColor = (verseNum) => {
    const highlight = chapterUserData.highlights.find(h => h.v && h.v.includes(verseNum));
    return highlight?.h || null;
  };

  // --- UI RENDERING EFFECT ---
  useEffect(() => {
    // Return early if essential data isn't loaded yet
    if (!bibleData || !titlesData || !isUserDataLoaded) {
      if (!bibleData || !titlesData || !isUserDataLoaded) {
        // Keep spinner active
        setCards([<div className="spinner-grow text-center" key="loading" role="status"><span className="visually-hidden">Loading...</span></div>]);
      }
      return;
    }

    // Get user preferences from localStorage
    const currentFontSize = localStorage.getItem('fontSize');
    const currentCompact = localStorage.getItem('compact') === 'true';
    const theme = currentTheme;
    const colorText = theme === 'dark' ? 'text-warning' : 'text-danger';
    // --- RENDER BOOK INFO PAGE ---
    if (params.chapter === 'info') {
      let infoContent = [];
      const currentBookInfo = titlesData.find(t => t.n == params.book);
      const currentBookIntro = introData?.find(i => i.n == params.book);

      if (currentBookInfo) {
        infoContent.push(
          <div key='titlesinfo'>
            <div className="col mb-2 pushdata">
              <div className={`text-center mt-3 mb-1 ${colorText} fs-${currentFontSize - 1}`}><strong>{getTranslation().description}</strong></div>
              <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
                <div className=" g-2 text-center text-break">
                  <p className={`small fw-bold col mt-3 words-text fs-${currentFontSize}`}><img src="/assets/images/writer.png" height="28px" alt="writer" /> {currentBookInfo.w}</p>
                  <p className={`small fst-italic col words-text fs-${currentFontSize}`}><img src="/assets/images/date.png" height="28px" alt="date" /> {currentBookInfo.d}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (currentBookIntro) {
        infoContent.push(
          <div key='introinfos'>
            <div className="col mb-2 pushdata">
              <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
                <div className="d-flex flex-row row-col-3 g-2 text-break">
                  <div className={`col text-left m-3 words-text fs-${currentFontSize}`}>{currentBookIntro.t}</div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      setCards(infoContent);

      // --- RENDER CHAPTER CONTENT (VERSES) ---
    } else if (params.chapter !== 'info') {
      const finalContent = [];
      const currentChapterVerses = bibleData.filter(obj => Number(obj.b) == params.book && Number(obj.c) == params.chapter);
      const [startVerse, endVerse] = parseVerseRange(params.verse);
      itemsRef3.current = []; // Reset refs for the new chapter content to prevent stale scrolling targets

      // Helper to identify grouping for a verse based on saved items
      const getVerseGroupingKey = (vNum) => {
        // If this specific verse is the target of the current URL selection, 
        // don't treat it as the START of an automatic group.
        if (vNum === startVerse) return null;

        const bookmark = chapterUserData.bookmarks.find(b => b.v && b.v.includes(vNum));
        if (bookmark) return { type: 'bookmark', id: bookmark.id, data: bookmark };

        const note = chapterUserData.notes.find(n => n.v && n.v.includes(vNum));
        if (note) return { type: 'note', id: note.id, data: note };

        const highlight = chapterUserData.highlights.find(h => h.v && h.v.includes(vNum));
        if (highlight) return { type: 'highlight', id: highlight.id, data: highlight };

        return null;
      };

      // Use a 'for' loop to allow skipping ahead after grouping verses
      for (let i = 0; i < currentChapterVerses.length; i++) {
        const verseData = currentChapterVerses[i];
        const verseNum = Number(verseData.v);
        const isSelected = isVerseSelected(verseNum);

        // --- RENDER A GROUPED CARD FOR A VERSE RANGE (from URL) ---
        if (verseNum === startVerse && startVerse !== endVerse) {
          const versesInRange = currentChapterVerses.slice(i, i + (endVerse - startVerse + 1));

          // Collect all cross-references for the verses in this group
          const groupCrossReferences = Array.isArray(crossRefData)
            ? versesInRange.flatMap(verse =>
              crossRefData.filter(cr => cr.c == params.chapter && cr.v == verse.v)
            )
            : [];

          // Check if ALL verses in range have the SAME highlight color
          const highlightColors = versesInRange.map(v => getVerseHighlightColor(Number(v.v)));
          const allHaveSameHighlight = highlightColors.every(c => c === highlightColors[0] && c !== null && c !== undefined);
          const rangeHighlightColor = allHaveSameHighlight ? highlightColors[0] : null;

          // Visual Merging Logic (Selection-based) for URL Group
          const isGroupSelected = isVerseSelected(startVerse);
          const headingInfo = headingsData?.find(h => h.c == params.chapter && h.v == startVerse);
          const nextHeadingInfo = headingsData?.find(h => h.c == params.chapter && h.v == (endVerse + 1));

          const isPrevSelected = !headingInfo && isVerseSelected(startVerse - 1) && (i > 0 && Number(currentChapterVerses[i - 1].v) === startVerse - 1);
          const isNextSelected = !nextHeadingInfo && isVerseSelected(endVerse + 1) && (i + versesInRange.length < currentChapterVerses.length && Number(currentChapterVerses[i + versesInRange.length].v) === endVerse + 1);

          let selectionClass = isGroupSelected ? 'verse-selected' : '';
          if (isGroupSelected) {
            if (isPrevSelected) selectionClass += ' connected-top';
            if (isNextSelected) selectionClass += ' connected-bottom';
          }

          // Check if any verse in the group has indicators to determine margin needs
          const hasGroupIndicators = versesInRange.some(v => {
            // Quick check against user data without full render
            const vNum = Number(v.v);
            return chapterUserData.bookmarks.some(b => b.v.includes(vNum)) ||
              chapterUserData.notes.some(n => n.v.includes(vNum));
          });

          const compactMargin = hasGroupIndicators ? 'mb-1' : 'mb-0';
          const wrapperMarginClass = (isGroupSelected && isNextSelected) ? 'col mb-0 pushdata' : `col ${currentCompact ? compactMargin : 'mb-2'} pushdata`;

          finalContent.push(
            <div key={`url-group-${startVerse}-${endVerse}`} className={wrapperMarginClass} id={`v-${startVerse}`}>
              <div
                className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'} ${selectionClass}`}
                data-theme={currentTheme}
                onClick={() => handleVerseSelectRange(startVerse, endVerse)}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                {/* Assign the ref of all verses in range to this group element */}
                <div
                  className="card-body rounded col-12"
                  ref={el => {
                    for (let k = 0; k < versesInRange.length; k++) {
                      itemsRef3.current[i + k] = el;
                    }
                  }}
                  style={rangeHighlightColor ? { backgroundColor: rangeHighlightColor, color: '#333' } : {}}
                >
                  <div className="d-flex flex-row row-col-3 g-2 text-break">
                    <div className={`col text-left words-text fs-${currentFontSize}`}>
                      {/* Map over the verses in the range to display them individually */}
                      {versesInRange.map((verse, idx) => {
                        const vHighlight = !rangeHighlightColor ? getVerseHighlightColor(Number(verse.v)) : null;
                        const indicators = renderVerseIndicators(Number(verse.v), { type: 'url', isFirst: idx === 0, groupVerses: versesInRange.map(v => Number(v.v)) });
                        return (
                          <Fragment key={verse.v}>
                            <span className={`verse-num-wrapper ${indicators ? 'has-indicators' : ''}`}>
                              {indicators}
                              <Link
                                className={`text-decoration-none fw-bold words-text fs-${currentFontSize}`}
                                to={`/${params.book}/${params.chapter}/${verse.v}`}
                                style={rangeHighlightColor || vHighlight ? { color: '#333' } : {}}
                              >
                                {verse.v}.
                              </Link>
                            </span>
                            {' '}
                            {vHighlight ? (
                              <span style={{ backgroundColor: vHighlight, color: '#333' }}>{verse.t}</span>
                            ) : verse.t}
                            {' '}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                  {/* Render cross-references for the entire group, using the index of the first verse */}
                  {renderCrossReferences(groupCrossReferences, i, versesInRange.map(v => Number(v.v)))}
                </div>
              </div>
            </div>
          );

          // Skip the loop ahead past the verses we just grouped
          i += versesInRange.length - 1;

        } else {
          // --- RENDER A STORED-ITEM GROUPED CARD OR SINGLE VERSE ---
          // 1. First, check and render heading if any
          const headingInfo = headingsData?.find(h => h.c == params.chapter && h.v == verseNum);
          if (headingInfo && (!getLanguage() || getLanguage() == 'Malayalam')) {
            finalContent.push(
              <div key={`h-${verseData.v}`} className="col mb-2 pushdata" id={`h-${verseData.v}`}>
                <div className={`words-text-card ${currentCompact ? '' : 'shadow-md card'}`}>
                  <div className="card-body rounded col-12">
                    <div className={`col ${colorText} fw-bolder fst-italic heading-color words-text fs-${currentFontSize + 1}`}>{headingInfo.t}</div>
                    <div className="d-flex flex-row row-col-3 g-2 text-break">
                      <div className={`col ${colorText} fw-bolder heading-color words-text fs-${currentFontSize}`}>{headingInfo.h}</div>
                    </div>
                    <div className={`col ${colorText} fst-italic heading-color words-text fs-${currentFontSize + 1}`}>{headingInfo.sh}</div>
                  </div>
                </div>
              </div>
            );
          }

          // 2. Determine if this verse starts a saved-item group
          const groupKey = getVerseGroupingKey(verseNum);
          let groupVerses = [verseData];
          let nextIdx = i + 1;

          if (groupKey) {
            while (nextIdx < currentChapterVerses.length) {
              const nextVerseData = currentChapterVerses[nextIdx];
              const nextVerseNum = Number(nextVerseData.v);

              // Breaks: Heading, URL range start, or different grouping ID
              if (headingsData?.find(h => h.c == params.chapter && h.v == nextVerseNum)) break;
              if (nextVerseNum === startVerse) break;

              const nextGroupKey = getVerseGroupingKey(nextVerseNum);
              if (nextGroupKey && nextGroupKey.type === groupKey.type && nextGroupKey.id === groupKey.id) {
                groupVerses.push(nextVerseData);
                nextIdx++;
              } else {
                break;
              }
            }
          }

          // 3. Render Group OR Single Verse
          if (groupVerses.length > 1) {
            const groupStartV = Number(groupVerses[0].v);
            const groupEndV = Number(groupVerses[groupVerses.length - 1].v);
            const groupCrossReferences = Array.isArray(crossRefData)
              ? groupVerses.flatMap(v => crossRefData.filter(cr => cr.c == params.chapter && cr.v == v.v))
              : [];

            // Background color logic: if grouped by highlight, use it. Otherwise, find first available highlight.
            const rangeHighlightColor = groupKey.type === 'highlight' ? groupKey.data.h :
              groupVerses.map(v => getVerseHighlightColor(Number(v.v))).find(c => c);

            // Visual Merging Logic (Selection-based) for Stored Group
            const isGroupSelected = isVerseSelected(groupStartV);
            const nextHeadingInfo = headingsData?.find(h => h.c == params.chapter && h.v == (groupEndV + 1));

            const isPrevSelected = !headingInfo && isVerseSelected(groupStartV - 1) && (i > 0 && Number(currentChapterVerses[i - 1].v) === groupStartV - 1);
            const isNextSelected = !nextHeadingInfo && isVerseSelected(groupEndV + 1) && (nextIdx < currentChapterVerses.length && Number(currentChapterVerses[nextIdx].v) === groupEndV + 1);

            let selectionClass = isGroupSelected ? 'verse-selected' : '';
            if (isGroupSelected) {
              if (isPrevSelected) selectionClass += ' connected-top';
              if (isNextSelected) selectionClass += ' connected-bottom';
            }

            // detailed indicator check for groups (highlights might not have icons)
            const hasMainIndicators = groupKey.type === 'bookmark' || groupKey.type === 'note';
            const hasInnerIndicators = !hasMainIndicators && groupVerses.some(v => {
              const vNum = Number(v.v);
              return chapterUserData.bookmarks.some(b => b.v.includes(vNum)) ||
                chapterUserData.notes.some(n => n.v.includes(vNum));
            });

            const compactMargin = (hasMainIndicators || hasInnerIndicators) ? 'mb-1' : 'mb-0';
            const wrapperMarginClass = (isGroupSelected && isNextSelected) ? 'col mb-0 pushdata' : `col ${currentCompact ? compactMargin : 'mb-2'} pushdata`;

            finalContent.push(
              <div key={`group-${groupKey.type}-${groupKey.id}`} className={wrapperMarginClass} id={`v-${groupStartV}`}>
                <div
                  className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'} ${selectionClass}`}
                  onClick={() => handleVerseSelectRange(groupStartV, groupEndV)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <div
                    className="card-body rounded col-12"
                    ref={el => {
                      for (let k = 0; k < groupVerses.length; k++) {
                        itemsRef3.current[i + k] = el;
                      }
                    }}
                    style={rangeHighlightColor ? { backgroundColor: rangeHighlightColor, color: '#333' } : {}}
                  >
                    <div className="d-flex flex-row row-col-3 g-2 text-break">
                      <div className={`col text-left words-text fs-${currentFontSize}`}>
                        {groupVerses.map((v, idx) => {
                          const indicators = renderVerseIndicators(Number(v.v), { ...groupKey, isFirst: idx === 0, groupVerses: groupVerses.map(gv => Number(gv.v)) });
                          return (
                            <Fragment key={v.v}>
                              <span className={`verse-num-wrapper ${indicators ? 'has-indicators' : ''}`}>
                                {indicators}
                                <Link
                                  className={`text-decoration-none fw-bold words-text fs-${currentFontSize}`}
                                  to={`/${params.book}/${params.chapter}/${v.v}`}
                                  style={rangeHighlightColor ? { color: '#333' } : {}}
                                >
                                  {v.v}.
                                </Link>
                              </span>
                              {' '}{v.t}{' '}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {renderCrossReferences(groupCrossReferences, i, groupVerses.map(v => Number(v.v)))}
                  </div>
                </div>
              </div>
            );
            i = nextIdx - 1;

          } else {
            // SINGLE VERSE CARD
            const highlightColor = getVerseHighlightColor(verseNum);
            const verseCrossReferences = Array.isArray(crossRefData) ? crossRefData.filter(cr => cr.c == params.chapter && cr.v == verseData.v) : [];

            // Visual Merging Logic (Selection-based)
            const nextHeadingInfo = headingsData?.find(h => h.c == params.chapter && h.v == (verseNum + 1));
            const isPrevSelected = !headingInfo && isVerseSelected(verseNum - 1) && (i > 0 && Number(currentChapterVerses[i - 1].v) === verseNum - 1);
            const isNextSelected = !nextHeadingInfo && isVerseSelected(verseNum + 1) && (i < currentChapterVerses.length - 1 && Number(currentChapterVerses[i + 1].v) === verseNum + 1);

            let selectionClass = isSelected ? 'verse-selected' : '';
            if (isSelected) {
              if (isPrevSelected) selectionClass += ' connected-top';
              if (isNextSelected) selectionClass += ' connected-bottom';
            }

            const indicators = renderVerseIndicators(verseNum);
            const compactMargin = indicators ? 'mb-1' : 'mb-0';
            const wrapperMarginClass = (isSelected && isNextSelected) ? 'col mb-0 pushdata' : `col ${currentCompact ? compactMargin : 'mb-2'} pushdata`;

            finalContent.push(
              <div key={`v-${verseData.v}`} className={wrapperMarginClass} id={`v-${verseData.v}`}>
                <div
                  className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'} ${selectionClass}`}
                  data-theme={currentTheme}
                  onClick={() => handleVerseSelect(verseNum)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    className="card-body rounded col-12"
                    ref={el => itemsRef3.current[i] = el}
                    style={highlightColor ? { backgroundColor: highlightColor, color: '#333' } : {}}
                  >
                    <div className="d-flex flex-row row-col-3 g-2 text-break">
                      <div className={`col text-left words-text fs-${currentFontSize}`}>
                        <span className={`verse-num-wrapper ${indicators ? 'has-indicators' : ''}`}>
                          {indicators}
                          <Link
                            className={`text-decoration-none fw-bold words-text fs-${currentFontSize}`}
                            to={`/${params.book}/${params.chapter}/${verseData.v}`}
                            onClick={(e) => e.stopPropagation()}
                            style={highlightColor ? { color: '#333' } : {}}
                          >
                            {verseData.v}.
                          </Link>
                        </span> {verseData.t}
                      </div>
                    </div>
                    {renderCrossReferences(verseCrossReferences, i, [verseNum])}
                  </div>
                </div>
              </div>
            );
          }
        }
      }
      setCards(finalContent);
    }
  }, [bibleData, titlesData, headingsData, crossRefData, introData, activeCrossReference, location, expandedReferences, selectedVerses, chapterUserData, isUserDataLoaded, currentTheme, settingsTick, verseReferencesToggledOn]);

  // Separate effect for History logging to avoid re-logging on local state updates
  useEffect(() => {
    if (params.chapter !== 'info' && bibleData && bibleData.length > 0) {
      // Only log if we have data for this chapter
      const currentVerses = bibleData.filter(obj => Number(obj.b) == params.book && Number(obj.c) == params.chapter);
      if (currentVerses.length === 0) return;

      addToHistory(params.book, params.chapter);

      if (params.verse) {
        const [startV, endV] = parseVerseRange(params.verse);
        const verseObj = currentVerses.find(v => Number(v.v) === startV);
        if (verseObj) {
          addToHistory(
            params.book,
            params.chapter,
            startV,
            endV !== startV ? endV : null
          );
        }
      }
    }
  }, [params.book, params.chapter, params.verse, bibleData]);


  useEffect(() => {
    if (highlightedElementsRef.current.timer) {
      clearTimeout(highlightedElementsRef.current.timer);
    }
    if (highlightedElementsRef.current.verse && highlightedElementsRef.current.isTemporary) {
      highlightedElementsRef.current.verse.style.backgroundColor = '';
      highlightedElementsRef.current.verse.style.color = '';
    }
    if (highlightedElementsRef.current.button) {
      highlightedElementsRef.current.button.style.backgroundColor = '';
    }
    highlightedElementsRef.current = { verse: null, button: null, timer: null, isTemporary: false };

    const executionTimer = setTimeout(() => {
      const currentScrollKey = location.pathname;

      if (params.verse && bibleData) {
        const [startVerse, endVerse] = parseVerseRange(params.verse);
        let verseIndex = parseInt(endVerse) - 1;
        const verseElement = itemsRef3.current[verseIndex] || itemsRef3.current[itemsRef3.current.length - 1];

        if (verseIndex >= 0 && verseElement) {
          // Check if we already scrolled for this location to prevent re-scrolling on selection changes
          if (lastScrolledKeyRef.current !== currentScrollKey) {
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastScrolledKeyRef.current = currentScrollKey;
          }

          // Check for any permanent highlight in the range (since it might be a grouped card)
          // Only treat as permanent highlight if ALL verses in the range share the SAME highlight
          let permanentHighlightColor = null;
          const distinctHighlights = new Set();

          for (let v = startVerse; v <= endVerse; v++) {
            const h = getVerseHighlightColor(v);
            distinctHighlights.add(h);
          }

          // If we found exactly one highlight color and it is not null/undefined
          if (distinctHighlights.size === 1) {
            const val = distinctHighlights.values().next().value;
            if (val) permanentHighlightColor = val;
          }

          if (!permanentHighlightColor) {
            verseElement.style.backgroundColor = '#faebd7';
            verseElement.style.color = '#000';
            highlightedElementsRef.current.isTemporary = true;
          } else {
            // Restore permanent highlight if it was cleared by cleanup
            verseElement.style.backgroundColor = permanentHighlightColor;
            verseElement.style.color = '#333';
            highlightedElementsRef.current.isTemporary = false;
          }

          highlightedElementsRef.current.verse = verseElement;
        }
      }
      else if (!params.verse && bibleData) {
        // Scroll to top if new location
        if (lastScrolledKeyRef.current !== currentScrollKey) {
          const firstVerseElement = itemsRef3.current[0];

          if (firstVerseElement && params.book == '19') { // for psalms only we need to move to first verse in the chapter
            firstVerseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          lastScrolledKeyRef.current = currentScrollKey;
        }
      }
    }, 1);

    return () => clearTimeout(executionTimer);
  }, [bibleData, location, cards, params.verse, params.book]);

  function titlenav(allTitles) {
    const r = allTitles.filter(obj => obj.n == params.book);
    if (!r.length) return;

    const h_lang = !getLanguage() || getLanguage() === "Malayalam" ? r[0].bm : r[0].be;
    document.title = params.verse ? `${h_lang} (${params.chapter}:${params.verse}) | ${getTranslation().siteTitle}` : `${h_lang} (${params.chapter}) | ${getTranslation().siteTitle}`;
    setChaptername(h_lang);

    setNavigation(
      <div className="row row-2 justify-content-center mt-4">
        {(() => {
          let tp = [];
          if (params.chapter > 1) {
            tp.push(<div key="prev-ch" className="col-auto mr-auto"><Link title={getTranslation().preChapter} to={`/${params.book}/${parseInt(params.chapter) - 1}`}><div className="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-left.svg" alt="prev" /></div></Link></div>);
          }
          if (params.book > 1 && params.chapter == 1) {
            tp.push(<div key="prev-bk" className="col-auto mr-auto"><Link title={getTranslation().preBook} to={`/${parseInt(params.book) - 1}/1`}><div className="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-left.svg" alt="prev" /></div></Link></div>);
          }
          if (params.chapter < r[0].c) {
            tp.push(<div key="next-ch" className="col-auto"><Link title={getTranslation().nextChapter} to={`/${params.book}/${parseInt(params.chapter) + 1}`}><div className="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-right.svg" alt="next" /></div></Link></div>);
          }
          if (params.book < 66 && params.chapter >= r[0].c) {
            tp.push(<div key="next-bk" className="col-auto"><Link title={getTranslation().nextBook} to={`/${parseInt(params.book) + 1}/1`}><div className="arrowbutton card rounded-circle btn"><img src="/assets/images/arrow-right.svg" alt="next" /></div></Link></div>);
          }
          return tp;
        })()}
      </div>
    );

    setTitle(
      <div className="text-center mb-2">
        <div className="d-flex justify-content-center align-items-center">
          {params.book > 1 && <div key="t-prev-bk"><Link title={getTranslation().preBook} to={`/${parseInt(params.book) - 1}/1`}><div className="arrowbutton card rounded-circle btn btn-sm"><img src="/assets/images/arrow-left.svg" alt="prev" /></div></Link></div>}
          <h3 className="mx-3"><span className="text-primary fw-bold"><Link className="text-decoration-none" to={`/${r[0].n}/1`}>{h_lang}</Link></span> {params.chapter && !isNaN(params.chapter) ? ` - ${getTranslation().chapter} ${params.chapter}` : ''}</h3>
          {params.book < 66 && <div key="t-next-bk"><Link title={getTranslation().nextBook} to={`/${parseInt(params.book) + 1}/1`}><div className="arrowbutton card rounded-circle btn btn-sm"><img src="/assets/images/arrow-right.svg" alt="next" /></div></Link></div>}
        </div>
        <div className="row row-cols-auto mt-3 justify-content-center">
          {(() => {
            let td = [];
            if (!getLanguage() || getLanguage() == "Malayalam") {
              td.push(<div key='info-link' className={`numberbox`}><Link className="link-dark small text-decoration-none" to={`/${params.book}/info`}><div className={`col numberbox ${params.chapter === 'info' ? 'bg-info' : ''}`}>✞</div></Link></div>);
            }
            for (let i = 1; i <= r[0].c; i++) {
              td.push(
                <div key={i} className="numberbox">
                  <Link className="link-dark small text-decoration-none" to={`/${params.book}/${i}`}>
                    <div className="col numberbox" style={i == params.chapter ? { backgroundColor: "#8D9EFF" } : {}}>{i}</div>
                  </Link>
                </div>
              );
            }
            return td;
          })()}
        </div>
      </div>
    );
  }

  const getNoteReference = (note) => {
    if (!titlesData || !note) return "...";

    // Parse book and chapter from the compact ID
    let bookNum, chapterNum, versesArray;
    if (note.id) {
      const parsed = parseVerseId(note.id);
      bookNum = parsed.book;
      chapterNum = parsed.chapter;
      versesArray = note.v || parsed.verses || [];
    } else {
      // Fallback for new notes without ID yet
      bookNum = params.book;
      chapterNum = params.chapter;
      versesArray = note.v || [];
    }

    const titleObj = titlesData.find(t => String(t.n) == String(bookNum));
    const bookName = titleObj
      ? (!getLanguage() || getLanguage() === "Malayalam" ? titleObj.bm : titleObj.be)
      : `Book ${bookNum}`;

    const rangeStr = formatVerseRange(versesArray);
    return `${bookName} ${chapterNum}:${rangeStr}`;
  };

  return (
    <>
      <section className="py-2 mb-5">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <section id="scroll-target">
                <div className="container my-2">
                  <div className="row row-cols-1 justify-content-center">
                    {title}
                    {cards}
                    {navigation}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* Note Popover Modal / Interactive Tooltip */}
      {activeNotePopover && (
        <NoteEditor
          popover={activeNotePopover}
          content={editingNoteContent}
          reference={getNoteReference(activeNotePopover.note)}
          onContentChange={setEditingNoteContent}
          onClose={() => {
            setActiveNotePopover(null);
            setIsEditingNote(false);
          }}
          onDelete={async () => {
            await removeNote(activeNotePopover.note.id);
            setActiveNotePopover(null);
            setIsEditingNote(false);
            setRefreshKey(prev => prev + 1);
          }}
          onSave={async () => {
            const note = activeNotePopover.note;
            const trimmedContent = editingNoteContent.trim();

            if (trimmedContent) {
              // Parse book/chapter from ID for existing notes, or use params for new
              let bookNum, chapterNum, versesArray;
              if (note.id) {
                const parsed = parseVerseId(note.id);
                bookNum = parsed.book;
                chapterNum = parsed.chapter;
              } else {
                bookNum = params.book;
                chapterNum = params.chapter;
              }
              versesArray = activeNotePopover.selectedVerses || note.v || [];

              const startVerse = versesArray[0] || 1;
              const endVerse = versesArray[versesArray.length - 1] || startVerse;

              await addNote(
                bookNum,
                chapterNum,
                startVerse,
                endVerse,
                trimmedContent,
                versesArray
              );
            } else if (!activeNotePopover.isNew) {
              // Delete note if empty (only for existing notes)
              await removeNote(note.id);
            }
            setActiveNotePopover(null);
            setIsEditingNote(false);
            setRefreshKey(prev => prev + 1);
            handleClearSelection();
          }}
        />
      )}

      {/* Verse Action Toolbar */}
      {selectedVerses.length > 0 && (
        <VerseActionToolbar
          selectedVerses={selectedVerses}
          book={params.book}
          chapter={params.chapter}
          chapterName={chaptername}
          bibleData={bibleData}
          onClose={handleClearSelection}
          onActionComplete={handleActionComplete}
          onOpenNote={handleOpenNote}
          onToggleReferences={handleToggleReferences}
          hasReferencesShown={areReferencesShownForSelectedVerses()}
          globalRefsEnabled={areReferencesEnabled()}
        />
      )}

      {/* Global Hover Tooltip */}
      {/* Global Hover Tooltip */}
      {/* Global Hover Tooltip */}
      {/* Global Hover Tooltip */}
      {hoverNoteTooltip && (
        <GlobalNoteTooltip
          tooltip={hoverNoteTooltip}
          reference={getNoteReference(hoverNoteTooltip.note)}
          onClose={() => setHoverNoteTooltip(null)}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
              tooltipTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            tooltipTimeoutRef.current = setTimeout(() => {
              setHoverNoteTooltip(null);
            }, 300);
          }}
          onDelete={async () => {
            await removeNote(hoverNoteTooltip.note.id);
            setHoverNoteTooltip(null);
            setRefreshKey(p => p + 1);
          }}
          onEdit={() => {
            setHoverNoteTooltip(null);
            setActiveNotePopover({
              verseNum: hoverNoteTooltip.note.v ? hoverNoteTooltip.note.v[0] : 1,
              note: hoverNoteTooltip.note,
              isNew: false,
              selectedVerses: hoverNoteTooltip.note.v || [],
              x: hoverNoteTooltip.x,
              y: hoverNoteTooltip.y + 20,
            });
            setEditingNoteContent(hoverNoteTooltip.note.n || '');
            setIsEditingNote(true);
          }}
          theme={currentTheme}
        />
      )}


    </>
  );
}

export default Content;