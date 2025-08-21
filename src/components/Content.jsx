import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, React, Fragment } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import { getTranslation } from '../config/SiteTranslations';
import { speakcontent, getCacheData, addDataIntoCache, copyToClipBoard, getLanguage, areReferencesEnabled } from '../config/Utils';

// This sub-component is correct and does not need any changes.
function CrossReferenceVerse({ to, fullBibleData, titles }) {
  const startRef = to[0];
  const endRef = to.length > 1 ? to[1] : startRef;
  const [startBook, startChapter, startVerse] = startRef.split('/').map(Number);
  const [endBook, endChapter, endVerse] = endRef.split('/').map(Number);

  const referencedVerses = fullBibleData.filter(verse => {
    const verseBook = Number(verse.b);
    const verseChapter = Number(verse.c);
    const verseNum = Number(verse.v);
    if (verseBook !== startBook) return false;
    if (startChapter === endChapter) return (verseChapter === startChapter && verseNum >= startVerse && verseNum <= endVerse);
    const inStartChapter = (verseChapter === startChapter && verseNum >= startVerse);
    const inEndChapter = (verseChapter === endChapter && verseNum <= endVerse);
    const inMiddleChapter = (verseChapter > startChapter && verseChapter < endChapter);
    return inStartChapter || inEndChapter || inMiddleChapter;
  });

  if (referencedVerses.length === 0) return null;

  const bookInfo = titles.find(t => t.n === startBook);
  const bookName = bookInfo ? (!getLanguage() || getLanguage() === "Malayalam" ? bookInfo.bm : bookInfo.be) : `Book ${startBook}`;
  const referenceTitle = startRef === endRef
    ? `${bookName} ${startChapter}:${startVerse}`
    : startChapter === endChapter
      ? `${bookName} ${startChapter}:${startVerse}-${endVerse}`
      : `${bookName} ${startChapter}:${startVerse} - ${endChapter}:${endVerse}`;

  return (
    <div className="p-2 mt-2 border rounded" style={{ color:'#000', backgroundColor: '#faebd7' }}>
      <p className="fw-bold mb-1"><Link to={`/${startRef}`} className="text-decoration-none text-danger" title={referenceTitle}>{referenceTitle}</Link></p>
      {referencedVerses.map(verse => (
        <span key={verse.v}><strong className="me-1">{verse.v}</strong>{verse.t}{' '}</span>
      ))}
    </div>
  );
}

function Content() {
  let params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // --- STATE ---
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const [chaptername, setChaptername] = useState("");
  const [activeCrossReference, setActiveCrossReference] = useState({});
  const [bibleData, setBibleData] = useState(null);
  const [titlesData, setTitlesData] = useState(null);
  const [headingsData, setHeadingsData] = useState(null);
  const [crossRefData, setCrossRefData] = useState(null);
  const [introData, setIntroData] = useState(null);

  const itemsRef = useRef([]);
  const itemsRef2 = useRef([]);
  const itemsRef3 = useRef([]);

  // --- INPUT VALIDATION ---
  if (isNaN(parseInt(params.book))) { navigate("/1/1"); }
  else if (parseInt(params.book) > 66) { navigate("/66/1"); }
  else if (parseInt(params.book) < 1) { navigate("/1/1"); }
  else if ((isNaN(parseInt(params.chapter)) || parseInt(params.chapter) <= 0 || !params.chapter) && params.chapter !== 'info') {
    navigate(`/${params.book}/1`);
  }

  // --- HANDLERS ---
  const handleCrossReferenceClick = (crossRefData, verseIndex) => {
    setActiveCrossReference(prev => {
      // Check if the button being clicked is already the active one
      const isAlreadyActive = prev.verseIndex === verseIndex && prev.refData === crossRefData;

      // If it is, close it (return empty object). Otherwise, set the new active one.
      return isAlreadyActive ? {} : { verseIndex, refData: crossRefData };
    });
  };


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
    if (siteConfig().cross_reference_path) {
      const url = `${siteConfig().cross_reference_path}${params.book}.json`;
      const cached = await getCacheData('cache', url);
      if (cached) return cached;
      try {
        const response = await axios.get(url);
        addDataIntoCache('cache', url, response.data);
        return response.data;
      } catch (error) { return null; }
    }
    return null;
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
  useEffect(() => {
    window.speechSynthesis.cancel();
    setCards([<div className="spinner-grow text-center" key="loading" role="status"><span className="visually-hidden">Loading...</span></div>]);

    // Reset all state on navigation
    setActiveCrossReference({});
    setBibleData(null);
    setTitlesData(null);
    setHeadingsData(null);
    setCrossRefData(null);
    setIntroData(null);
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
  }, [location]);

  // --- UI RENDERING EFFECT ---
  useEffect(() => {
    if (!bibleData || !titlesData) {
      return;
    }

    const showRefs = areReferencesEnabled();
    const currentFontSize = localStorage.getItem('fontSize');
    const currentCompact = Boolean(localStorage.getItem('compact'));
    const theme = localStorage.getItem('theme');
    const colorText = theme === 'dark' ? 'text-warning' : 'text-danger';

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

    } else if (params.chapter !== 'info') {
      let finalContent = [];
      const currentChapterVerses = bibleData.filter(obj => Number(obj.b) == params.book && Number(obj.c) == params.chapter);
      const chap = JSON.stringify(currentChapterVerses);

      currentChapterVerses.forEach((verseData, index) => {
        const headingInfo = headingsData?.find(h => h.c == params.chapter && h.v == verseData.v);
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

        const verseCrossReferences = crossRefData ? crossRefData.filter(cr => cr.c == params.chapter && cr.v == verseData.v) : [];

        finalContent.push(
          <div key={`v-${verseData.v}`} className="col mb-2 pushdata" id={`v-${verseData.v}`}>
            <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
              <div className="card-body rounded col-12" ref={el => itemsRef3.current[index] = el}>
                <div className="d-flex flex-row row-col-3 g-2 text-break">
                  <div className={`col text-left words-text fs-${currentFontSize}`}>
                    <span className="fw-bold"><Link className={`text-decoration-none words-text fs-${currentFontSize}`} to={`/${params.book}/${params.chapter}/${verseData.v}`}>{verseData.v}.</Link></span> {verseData.t}
                  </div>
                  <div className={`words-text-player ${currentCompact ? 'd-none' : ''} col-auto text-right ml-auto my-auto`}>
                    {(() => {
                      let td = [];
                      if (('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && navigator.onLine) {
                        td.push(
                          <div key="speak-btn" style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle">
                            <a ref={el => itemsRef2.current[index] = el} onClick={() => speakcontent(chap, index, itemsRef, itemsRef2, itemsRef3)} className="btn btn-small rounded-circle fw-bold arrowbutton">
                              <img ref={el => itemsRef.current[index] = el} src="/assets/images/play.svg" width="16px" height="16px" alt="play" />
                            </a>
                          </div>
                        );
                      }
                      td.push(
                        <div key="copy-btn" style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle">
                          <a ref={el => itemsRef2.current[`c-${index}`] = el} onClick={() => copyToClipBoard(`${verseData.t} (${chaptername} ${params.chapter}:${verseData.v})`, index, itemsRef, itemsRef2)} className="btn btn-small rounded-circle fw-bold arrowbutton">
                            <img ref={el => itemsRef.current[`c-${index}`] = el} src="/assets/images/clipboard.svg" width="16px" height="16px" alt="copy" />                            </a>
                        </div>
                      );
                      return td;
                    })()}
                  </div>
                </div>

                {showRefs && verseCrossReferences.length > 0 && (
                  <div className="mt-2">
                    <div>
                      {verseCrossReferences.sort((a, b) => b.lyk - a.lyk).map((cr, i) => (
                        <button
                          key={i}
                          // Pass the verse's index to the handler
                          onClick={() => handleCrossReferenceClick(cr, index)}
                          // The button is active only if BOTH the verse index and ref data match
                          className={`btn btn-sm ${activeCrossReference.verseIndex === index && activeCrossReference.refData === cr ? 'btn-primary' : 'btn-light'} rounded-pill me-2 `}
                          style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', lineHeight: '1.2' }}
                        >
                          {cr.to.length > 1 ? `${cr.to[0]}-${cr.to[1].split('/')[2]}` : cr.to[0]}
                        </button>
                      ))}
                    </div>

                    {/* This now ONLY renders if the active reference belongs to THIS verse (index) */}
                    {activeCrossReference.verseIndex === index && (
                      <CrossReferenceVerse
                        to={activeCrossReference.refData.to}
                        fullBibleData={bibleData}
                        titles={titlesData}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      });
      setCards(finalContent);
    }
  }, [bibleData, titlesData, headingsData, crossRefData, introData, activeCrossReference, location]);

  // --- FIX: DEDICATED EFFECT FOR HIGHLIGHTING ---
  // This hook runs AFTER the cards have been rendered to the screen.
  useEffect(() => {
    if (params.verse) {
      const verseIndex = parseInt(params.verse) - 1;

      // Check if the DOM element is available in our ref array
      if (verseIndex >= 0 && itemsRef3.current[verseIndex]) {
        const verseElement = itemsRef3.current[verseIndex];
        const speakButtonContainer = itemsRef2.current[verseIndex];

        // Scroll to the verse and apply highlighting
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        verseElement.style.backgroundColor = '#faebd7';
        verseElement.style.color = '#000';

        if (speakButtonContainer) {
          speakButtonContainer.style.backgroundColor = '#ffb380';
        }

        // Set a timeout to remove the highlight after a delay
        setTimeout(() => {
          if (verseElement) { // Add safety check in case component unmounts
            verseElement.style.backgroundColor = '';
            verseElement.style.color = '';
          }
          if (speakButtonContainer) {
            speakButtonContainer.style.backgroundColor = '';
          }
        }, 2000); // Highlight for 2 seconds
      }
    }
  }, [navigation]);

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

  return (
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
  );
}

export default Content;