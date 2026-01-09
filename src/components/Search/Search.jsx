import { Link, useParams, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../../config/siteConfig";
import { getTranslation } from '../../config/SiteTranslations';
import { speaksearch, getCacheData, addDataIntoCache, copyToClipBoard, getLanguage } from '../../config/Utils';
import Topdown from "../../features/Topdown";

// Optimization: By creating a memoized component for the search result item,
// React can skip re-rendering an item if its props haven't changed.
// This is highly effective when rendering a large list of items.
const MemoizedSearchResultItem = React.memo(({ item, index, q, title, onSpeak, onCopy, itemRefs }) => {
  const splited = item.t.replace(new RegExp(q, "gi"), (match) => `<span class='text-dark' style='background-color: #fff952;'>${match}</span>`);
  const currentFontSize = localStorage.getItem('fontSize');
  const currentCompact = localStorage.getItem('compact');
  const bookTitle = !getLanguage() || getLanguage() === "Malayalam" ? title.bm : title.be;

  return (
    <div className={`col mb-2 pushdata`} id={`v-${item.v}`}>
      <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
        <span className={`words-text-player position-absolute mt-3 translate-middle badge rounded-pill ${currentCompact ? 'd-none' : ''}`} style={{ backgroundColor: 'rgb(238, 238, 238)' }}>
          <a className="link-primary fw-bold small text-decoration-none">{index + 1}</a>
        </span>
        <div className="card-body col-12" ref={el => itemRefs.itemsRef3.current[index] = el}>
          <div className="row row-col-2 g-2">
            <div className={`col text-left words-text fs-${currentFontSize}`}>
              <div dangerouslySetInnerHTML={{ __html: splited }} />
              <Link className="link-dark small text-decoration-none" to={`/${item.b}/${item.c}/${item.v}`}>
                <div className="fw-bold text-primary">({bookTitle} {item.c}:{item.v})</div>
              </Link>
            </div>
            <div className={`words-text-player ${currentCompact ? 'd-none' : ''} col-auto text-right ml-auto my-auto`}>
              {('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && navigator.onLine && (
                <div style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle">
                  <a ref={el => itemRefs.itemsRef2.current[index] = el} onClick={() => onSpeak(item.t, index)} className="btn btn-small rounded-circle fw-bold arrowbutton">
                    <img ref={el => itemRefs.itemsRef.current[index] = el} src="/assets/images/play.svg" width="16px" height="16px" alt="Speak" />
                  </a>
                </div>
              )}
              <div style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle">
                <a ref={el => itemRefs.itemsRef2.current["c-" + index] = el} onClick={() => onCopy(`${item.t} (${bookTitle} ${item.c}:${item.v})`, index)} className="btn btn-small rounded-circle fw-bold arrowbutton">
                  <img ref={el => itemRefs.itemsRef.current["c-" + index] = el} src="/assets/images/clipboard.svg" width="16px" height="16px" alt="Copy" />
                </a>
              </div>
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

  // Refs remain the same for interacting with DOM elements directly.
  const itemsRef = useRef([]);
  const itemsRef2 = useRef([]);
  const itemsRef3 = useRef([]);

  const q = searchParams.get("q") || "";
  const pval = Number.isInteger(parseInt(searchParams.get("p"))) ? parseInt(searchParams.get("p")) : 1;
  const rangevalue = 500;

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

  // Optimization: useMemo calculates filtered results only when data or query changes.
  // This avoids re-filtering the entire bible on every render.
  const filteredResults = useMemo(() => {
    if (!q || bibleData.length === 0) return bibleData;
    return bibleData.filter(obj => obj.t.toLowerCase().includes(q.toLowerCase()));

  }, [q, bibleData]);


  // Side-effects like changing the document title or navigating programmatically
  // are handled in a separate useEffect that depends on the calculated results.
  useEffect(() => {
    const totalPages = Math.ceil(filteredResults.length / rangevalue);
    if (pval > totalPages && totalPages > 0) {
      navigate(`/search?q=${q}&p=${totalPages}`);
    } else if (pval < 1 && q) {
      navigate(`/search?q=${q}`);
    }

    if (q) {
      document.title = `Search: ${q}${pval > 1 ? ` | page ${pval}` : ''} | ${getTranslation().siteTitle}`;
    }
  }, [q, pval, filteredResults.length, navigate, rangevalue]);

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


  // Optimization: Memoize the result count message.
  const resultCountMessage = useMemo(() => {
    const r_length = filteredResults.length;
    if (r_length <= 0) {
      return <div className="text-center fw-lighter mb-3 text-secondary">No results found</div>;
    }
    if (r_length < rangevalue) {
      return <div className="text-center fw-lighter mb-3 text-secondary">Search word "{q}" found in {r_length} verses</div>;
    }

    let range;
    if (pval === 1) {
      range = `first ${rangevalue}`;
    } else {
      const start = ((pval - 1) * rangevalue) + 1;
      const end = Math.min(start + rangevalue - 1, r_length);
      range = `${start} to ${end}`;
    }
    return <div className="text-center fw-lighter mb-3 text-secondary">Showing the {range} of {r_length} verses matching the search word {q ? `"${q}"` : ""}</div>;
  }, [filteredResults.length, pval, rangevalue]);

  const onSpeak = useCallback((text, index) => {
    speaksearch(text, index, itemsRef, itemsRef2, itemsRef3)
  }, []); // Empty dependency array means these functions are created only once.

  const onCopy = useCallback((text, index) => {
    copyToClipBoard(text, index, itemsRef, itemsRef2)
  }, []);

  // Optimization: Memoize the generated list of cards.
  // The list is only re-calculated if the filtered results, titles, or page number change.
  const cards = useMemo(() => {
    const startIndex = (pval - 1) * rangevalue;
    const endIndex = startIndex + rangevalue;
    const itemsToRender = filteredResults.slice(startIndex, endIndex);


    return itemsToRender.map((item, i) => {
      const index = startIndex + i;
      const title = titleData.find(t => String(t.n) == String(item.b));
      if (!title) return null; // Handle case where title might not be found

      return (
        <MemoizedSearchResultItem
          key={`${item.b}-${item.c}-${item.v}`}
          item={item}
          index={index}
          q={q}
          title={title}
          onSpeak={onSpeak}
          onCopy={onCopy}
          itemRefs={{ itemsRef, itemsRef2, itemsRef3 }}
        />
      );
    });
  }, [filteredResults, pval, rangevalue, q, titleData, onSpeak, onCopy]);


  // Optimization: Memoize the pagination component.
  const navigation = useMemo(() => {
    const totalPages = Math.ceil(filteredResults.length / rangevalue);
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

    const handlePageChange = (e) => {
      navigate(`/search?q=${q}&p=${e.target.value}`);
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
          <Link className="link-dark small text-decoration-none" to={`/search?q=${q}&p=${pageTarget}`}>
            <div className="col numberbox">{num}</div>
          </Link>
        </div>
      );
    });
  }, [filteredResults.length, rangevalue, pval, q, navigate]);

  return (
    <section className="py-2 mb-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <section id="scroll-target">
              <div className="container my-2">
                <div className="row row-cols-1 justify-content-center">
                  {resultCountMessage}
                  {isLoading ? (
                    <div className="spinner-grow text-center" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : (
                    <>
                      {cards}
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
  );
}

export default Search;