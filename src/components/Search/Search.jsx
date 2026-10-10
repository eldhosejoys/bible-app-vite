import { Link, useParams, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../../config/siteConfig";
import { getTranslation } from '../../config/SiteTranslations';
import { getCacheData, addDataIntoCache, getLanguage } from '../../config/Utils';
import { copyVerseText } from '../../config/VerseStorage';
import { searchBible, highlightVerseText, normalizeText } from '../../services/SearchService';
import Topdown from "../../features/Topdown";
import VerseActionToolbar from "../VerseActionToolbar";

// Optimization: By creating a memoized component for the search result item,
// React can skip re-rendering an item if its props haven't changed.
// This is highly effective when rendering a large list of items.
const MemoizedSearchResultItem = React.memo(({ item, index, q, title, onCopy, copyStates, isSelected, onSelect }) => {
  const splited = highlightVerseText(item.t, q, item.terms || (item.match ? Object.keys(item.match) : null));
  const currentFontSize = localStorage.getItem('fontSize');
  const currentCompact = localStorage.getItem('compact');
  const bookTitle = !getLanguage() || getLanguage() === "Malayalam" ? title.bm : title.be;
  const copyState = copyStates[index];

  return (
    <div className={`col mb-2 pushdata`} id={`v-${item.v}`}>
      <div
        className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'} ${isSelected ? 'border-primary' : ''}`}
        style={isSelected ? { backgroundColor: 'rgba(13, 110, 253, 0.1)', cursor: 'pointer' } : { cursor: 'pointer' }}
        onClick={() => onSelect(item)}
      >
        <span className={`words-text-player position-absolute mt-3 translate-middle badge rounded-pill ${currentCompact ? 'd-none' : ''}`} style={{ backgroundColor: 'rgb(238, 238, 238)' }}>
          <a className="link-primary fw-bold small text-decoration-none">{index + 1}</a>
        </span>
        <div className="card-body col-12">
          <div className="row row-col-2 g-2">
            <div className={`col text-left words-text fs-${currentFontSize}`}>
              <div dangerouslySetInnerHTML={{ __html: splited }} />
              <Link className="link-dark small text-decoration-none" to={`/${item.b}/${item.c}/${item.v}`} onClick={(e) => e.stopPropagation()}>
                <div className="fw-bold text-primary">({bookTitle} {item.c}:{item.v})</div>
              </Link>
            </div>
            <div className={`words-text-player d-none col-auto text-right ml-auto my-auto`}>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


function Search() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State Management: Keep track of raw data and loading status.
  // This is clearer than storing generated JSX in state.
  const [bibleData, setBibleData] = useState([]);
  const [titleData, setTitleData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStates, setCopyStates] = useState({}); // Track copy button states
  const [selectedItems, setSelectedItems] = useState([]); // Track selected verses

  const handleVerseSelect = useCallback((item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.b == item.b && i.c == item.c && i.v == item.v);
      if (exists) {
        return prev.filter(i => i.b !== item.b || i.c !== item.c || i.v !== item.v);
      } else {
        const titleObj = titleData.find(t => String(t.n) == String(item.b));
        const bookTitle = titleObj
          ? (!getLanguage() || getLanguage() === "Malayalam" ? titleObj.bm : titleObj.be)
          : `Book ${item.b}`;
        return [...prev, { ...item, bookName: bookTitle }];
      }
    });
  }, [titleData]);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);


  const q = searchParams.get("q") || "";
  const pval = Number.isInteger(parseInt(searchParams.get("p"))) ? parseInt(searchParams.get("p")) : 1;
  const rangevalue = 500;
  const modeParam = searchParams.get("mode") === "exact" ? "exact" : "all";
  const [matchMode, setMatchMode] = useState(modeParam);

  useEffect(() => {
    const urlMode = searchParams.get("mode") === "exact" ? "exact" : "all";
    setMatchMode(urlMode);
  }, [searchParams]);

  // Optimization: Consolidate data fetching into a single useEffect hook.
  // Fetches bible and title data in parallel for faster loading.
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchData = async () => {
      try {
        const fetchWithCache = async (key, url) => {
          const cached = await getCacheData('cache', url);
          if (cached) return cached;
          const response = await axios.get(url);
          addDataIntoCache('cache', url, response.data);
          return response.data;
        };

        // Promise.all fetches both resources concurrently, not one after the other.
        const [bible, titles] = await Promise.all([
          fetchWithCache('bible', getBible()),
          fetchWithCache('titles', siteConfig().titleurl)
        ]);

        setBibleData(bible);
        setTitleData(titles);

      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Optionally set an error state here
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [location]); // This effect re-runs only when the URL location changes.

  const currentLang = getLanguage() || 'Malayalam';

  // Optimization: useMemo calculates search results using MiniSearch and reference resolution.
  const filteredResults = useMemo(() => {
    if (!q || bibleData.length === 0) return bibleData;
    return searchBible(q, bibleData, titleData, currentLang);
  }, [q, bibleData, titleData, currentLang]);


  const isMalayalam = !currentLang || currentLang === 'Malayalam';

  // Separate exact matches vs related / fuzzy / spread matches
  const { exactResults, relatedResults, exactCount, relatedCount, isMultiWord } = useMemo(() => {
    if (!q || filteredResults.length === 0) {
      return { exactResults: [], relatedResults: [], exactCount: 0, relatedCount: 0, isMultiWord: false };
    }

    const normQuery = normalizeText(q);
    const queryTerms = normQuery
      .trim()
      .split(/\s+/)
      .map(t => t.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, ''))
      .filter(t => t.length > 0);

    if (queryTerms.length === 0) {
      return { exactResults: filteredResults, relatedResults: [], exactCount: filteredResults.length, relatedCount: 0, isMultiWord: false };
    }

    const isMultiWord = queryTerms.length > 1;
    const exact = [];
    const related = [];

    if (isMultiWord) {
      // For multi-word queries: exact match requires contiguous phrase appearance (not spread across)
      const escapedTerms = queryTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const phraseRegex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])(${escapedTerms.join('[\\s\\p{P}]+')})($|[^\\p{L}\\p{M}\\p{N}])`, 'u');
      for (const item of filteredResults) {
        if (phraseRegex.test(normalizeText(item.t))) {
          exact.push(item);
        } else {
          related.push(item);
        }
      }
    } else {
      // For single word query: whole-word exact match
      const singleTerm = queryTerms[0];
      for (const item of filteredResults) {
        const normText = normalizeText(item.t);
        const words = normText.split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
        const wordSet = new Set(words);
        if (wordSet.has(singleTerm)) {
          exact.push(item);
        } else {
          related.push(item);
        }
      }
    }

    return {
      exactResults: exact,
      relatedResults: related,
      exactCount: exact.length,
      relatedCount: related.length,
      isMultiWord
    };
  }, [filteredResults, q]);

  // Active list of verses based on toggle ('all' = combined, 'exact' = exact matches only)
  const displayedResults = useMemo(() => {
    if (matchMode === 'exact') {
      return exactResults;
    }
    return filteredResults;
  }, [matchMode, exactResults, filteredResults]);

  // Side-effects like changing the document title or navigating programmatically
  // are handled in a separate useEffect that depends on the calculated results.
  useEffect(() => {
    const totalPages = Math.ceil(displayedResults.length / rangevalue);
    const modeQuery = matchMode === 'exact' ? '&mode=exact' : '';
    if (pval > totalPages && totalPages > 0) {
      navigate(`/search?q=${q}${modeQuery}&p=${totalPages}`);
    } else if (pval < 1 && q) {
      navigate(`/search?q=${q}${modeQuery}`);
    }

    if (q) {
      document.title = `Search: ${q}${pval > 1 ? ` | page ${pval}` : ''} | ${getTranslation().siteTitle}`;
    }
  }, [q, pval, displayedResults.length, navigate, rangevalue, matchMode]);

  useEffect(() => {
    const cleanQ = q.trim().replace(/^\//, '').replace(/\/$/, '');

    // Regex to match:
    // 1
    // 1/2
    // 1/2/3
    // 1/2/3-4
    // 1/2/3:4
    // 1/2/3:4-6
    const pathRegex = /^(\d+)(?:\/(\d+))?(?:\/(\d+(?::\d+)?(?:-\d+)?))?$/;

    if (pathRegex.test(cleanQ)) {
      const parts = cleanQ.split('/');
      if (parts.length === 1) {
        navigate(`/${parts[0]}/1`);
      } else {
        navigate(`/${cleanQ}`);
      }
    }
  }, [q, navigate]);

  // Optimization: Memoize the result count message distinguishing exact & related matches.
  const resultCountMessage = useMemo(() => {
    const total = filteredResults.length;
    if (total <= 0) {
      return (
        <div className="text-center fw-lighter mb-3 text-secondary">
          {isMalayalam ? "ഫലങ്ങളൊന്നും കണ്ടെത്തിയില്ല" : "No results found"}
        </div>
      );
    }

    const renderBreakdown = () => {
      const exactLabel = isMultiWord
        ? (isMalayalam ? "കൃത്യമായ പ്രയോഗം" : "exact phrase")
        : (isMalayalam ? "കൃത്യമായ വാക്ക്" : "exact match");
      const exactPlural = isMultiWord
        ? (isMalayalam ? "കൃത്യമായ പ്രയോഗം" : "exact phrases")
        : (isMalayalam ? "കൃത്യമായ വാക്കുകൾ" : "exact matches");

      if (exactCount > 0 && relatedCount > 0) {
        return (
          <span className="small opacity-75 ms-1">
            ({exactCount} {exactCount === 1 ? exactLabel : exactPlural}, {relatedCount} {isMalayalam ? "അനുബന്ധം" : "related"})
          </span>
        );
      }
      if (exactCount === 0 && relatedCount > 0) {
        return (
          <span className="small opacity-75 ms-1">
            ({relatedCount} {isMalayalam ? (isMultiWord ? "അനുബന്ധ / ചിതറിയ പൊരുത്തങ്ങൾ" : "അനുബന്ധ / സമാന വാക്കുകൾ") : "related / spread matches"})
          </span>
        );
      }
      if (exactCount > 0 && relatedCount === 0) {
        return (
          <span className="small opacity-75 ms-1">
            ({isMalayalam ? (isMultiWord ? "എല്ലാം കൃത്യമായ പ്രയോഗങ്ങൾ" : "എല്ലാം കൃത്യമായ വാക്കുകൾ") : (isMultiWord ? "all exact phrase matches" : "all exact matches")})
          </span>
        );
      }
      return null;
    };

    const activeTotal = displayedResults.length;

    if (activeTotal < rangevalue) {
      return (
        <div className="text-center fw-lighter mb-1 text-secondary">
          {isMalayalam ? (
            <>
              "{q}" : <strong>{activeTotal}</strong> {matchMode === 'exact' ? "കൃത്യമായ വാക്യങ്ങളിൽ കണ്ടെത്തി" : "വാക്യങ്ങളിൽ കണ്ടെത്തി"} {matchMode === 'all' && renderBreakdown()}
            </>
          ) : (
            <>
              Found {activeTotal} {activeTotal === 1 ? "verse" : "verses"} {matchMode === 'exact' ? "(exact only)" : ""} for "{q}" {matchMode === 'all' && renderBreakdown()}
            </>
          )}
        </div>
      );
    }

    let range;
    if (pval === 1) {
      range = isMalayalam ? `ആദ്യ ${rangevalue}` : `first ${rangevalue}`;
    } else {
      const start = ((pval - 1) * rangevalue) + 1;
      const end = Math.min(start + rangevalue - 1, activeTotal);
      range = `${start} to ${end}`;
    }

    return (
      <div className="text-center fw-lighter mb-1 text-secondary">
        {isMalayalam ? (
          <>
            "{q}" : {activeTotal} വാക്യങ്ങളിൽ {range} കാണിക്കുന്നു {matchMode === 'all' && renderBreakdown()}
          </>
        ) : (
          <>
            Showing {range} of {activeTotal} verses for "{q}" {matchMode === 'all' && renderBreakdown()}
          </>
        )}
      </div>
    );
  }, [filteredResults.length, displayedResults.length, exactCount, relatedCount, isMultiWord, pval, rangevalue, q, isMalayalam, matchMode]);

  // Simple subtle segmented toggle: "Combined" vs "Exact"
  const toggleFilter = useMemo(() => {
    if (!q || filteredResults.length === 0) return null;

    return (
      <div className="d-flex justify-content-center align-items-center mb-3">
        <div
          className="d-inline-flex p-1 rounded-pill"
          style={{
            backgroundColor: 'rgba(128, 128, 128, 0.12)',
            border: '1px solid rgba(128, 128, 128, 0.18)',
            gap: '3px'
          }}
          role="group"
          aria-label="Filter results"
        >
          <button
            type="button"
            className="btn btn-sm rounded-pill border-0 shadow-none"
            style={{
              fontSize: '0.78rem',
              padding: '2px 11px',
              lineHeight: 1.3,
              fontWeight: matchMode === 'all' ? 600 : 400,
              backgroundColor: matchMode === 'all' ? 'var(--bs-secondary-bg, rgba(128, 128, 128, 0.25))' : 'transparent',
              color: matchMode === 'all' ? 'var(--bs-emphasis-color, inherit)' : 'var(--bs-secondary-color, #888)',
              boxShadow: matchMode === 'all' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              if (matchMode !== 'all') {
                setMatchMode('all');
                navigate(`/search?q=${q}&p=1`);
              }
            }}
          >
            {isMalayalam ? `എല്ലാം (${filteredResults.length})` : `Combined (${filteredResults.length})`}
          </button>
          <button
            type="button"
            className="btn btn-sm rounded-pill border-0 shadow-none"
            style={{
              fontSize: '0.78rem',
              padding: '2px 11px',
              lineHeight: 1.3,
              fontWeight: matchMode === 'exact' ? 600 : 400,
              backgroundColor: matchMode === 'exact' ? 'var(--bs-secondary-bg, rgba(128, 128, 128, 0.25))' : 'transparent',
              color: matchMode === 'exact' ? 'var(--bs-emphasis-color, inherit)' : 'var(--bs-secondary-color, #888)',
              boxShadow: matchMode === 'exact' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              if (matchMode !== 'exact') {
                setMatchMode('exact');
                navigate(`/search?q=${q}&mode=exact&p=1`);
              }
            }}
          >
            {isMalayalam ? `കൃത്യം (${exactCount})` : `Exact (${exactCount})`}
          </button>
        </div>
      </div>
    );
  }, [q, filteredResults.length, exactCount, matchMode, isMalayalam, navigate]);

  const onCopy = useCallback(async (text, reference, index) => {
    const result = await copyVerseText(text, reference);
    setCopyStates(prev => ({ ...prev, [index]: result.success ? 'success' : 'error' }));

    // Reset state after 2 seconds
    setTimeout(() => {
      setCopyStates(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }, 2000);
  }, []);

  // Optimization: Memoize the generated list of cards.
  // The list is only re-calculated if the filtered results, titles, or page number change.
  const cards = useMemo(() => {
    const startIndex = (pval - 1) * rangevalue;
    const endIndex = startIndex + rangevalue;
    const itemsToRender = displayedResults.slice(startIndex, endIndex);


    return itemsToRender.map((item, i) => {
      const index = startIndex + i;
      const title = titleData.find(t => String(t.n) == String(item.b));
      if (!title) return null; // Handle case where title might not be found

      const isActive = selectedItems.some(s => s.b == item.b && s.c == item.c && s.v == item.v);

      return (
        <MemoizedSearchResultItem
          key={`${item.b}-${item.c}-${item.v}`}
          item={item}
          index={index}
          q={q}
          title={title}
          onCopy={onCopy}
          copyStates={copyStates}
          isSelected={isActive}
          onSelect={handleVerseSelect}
        />
      );
    });
  }, [displayedResults, pval, rangevalue, q, titleData, onCopy, copyStates, selectedItems, handleVerseSelect]);


  // Optimization: Memoize the pagination component.
  const navigation = useMemo(() => {
    const totalPages = Math.ceil(displayedResults.length / rangevalue);
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === pval || (i <= pval + 4 && i >= pval - 4)) {
        pageNumbers.push(i);
      } else if (i === pval + 5) {
        pageNumbers.push('>>');
      } else if (i === pval - 5) {
        pageNumbers.push('<<');
      }
    }

    const modeParam = matchMode === 'exact' ? '&mode=exact' : '';

    const handlePageChange = (e) => {
      navigate(`/search?q=${q}${modeParam}&p=${e.target.value}`);
    };

    return pageNumbers.map((num, idx) => {
      if (num === pval) {
        return (
          <div key={idx} className="numberbox">
            <div className="col numberbox" style={{ "backgroundColor": "#8D9EFF" }}>
              <select style={{ "backgroundColor": "transparent", border: "none", outline: "0px" }} value={pval} onChange={handlePageChange}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <option className="bg-dark-subtle" key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        );
      }

      const pageTarget = num === '>>' ? pval + 5 : num === '<<' ? pval - 5 : num;
      return (
        <div key={idx} className="numberbox">
          <Link className="link-dark small text-decoration-none" to={`/search?q=${q}${modeParam}&p=${pageTarget}`}>
            <div className="col numberbox">{num}</div>
          </Link>
        </div>
      );
    });
  }, [displayedResults.length, rangevalue, pval, q, matchMode, navigate]);

  return (
    <>
      <section className="py-2 mb-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <section id="scroll-target">
                <div className="container my-2">
                  <div className="row row-cols-1 justify-content-center">
                    {resultCountMessage}
                    {toggleFilter}
                    {isLoading ? (
                      <div className="spinner-grow text-center" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <>
                        {matchMode === 'exact' && exactCount === 0 ? (
                          <div className="text-center my-4 py-4">
                            <p className="text-secondary mb-2">
                              {isMalayalam ? `"${q}" എന്നതിന് കൃത്യമായ പ്രയോഗം കണ്ടെത്തിയില്ല.` : `No exact matches found for "${q}".`}
                            </p>
                            <button
                              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                              style={{ fontSize: '0.8rem' }}
                              onClick={() => {
                                setMatchMode('all');
                                navigate(`/search?q=${q}&p=1`);
                              }}
                            >
                              {isMalayalam ? "എല്ലാ പൊരുത്തങ്ങളും കാണുക" : "Show combined results"}
                            </button>
                          </div>
                        ) : (
                          cards
                        )}
                      </>
                    )}
                    <div></div>
                    {isLoading || navigation}

                  </div>
                  <Topdown />
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {selectedItems.length > 0 && (
        <VerseActionToolbar
          explicitVerses={selectedItems}
          onClose={handleClearSelection}
          onActionComplete={handleClearSelection}
        />
      )}
    </>
  );
}

export default Search;