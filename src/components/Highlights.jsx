import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHighlights, removeHighlight, getHighlightColors, getHighlightDetails, onVerseStorageChange } from '../config/VerseStorage';
import { getTranslation } from '../config/SiteTranslations';
import { formatDateTime, getCacheData, addDataIntoCache, getLanguage, formatVerseRange } from '../config/Utils';
import { siteConfig, getBible } from '../config/siteConfig';
import axios from 'axios';

function Highlights({ inModal = false, onNavigate }) {
    const [highlights, setHighlights] = useState([]);
    const [allHighlights, setAllHighlights] = useState([]);  // Store all highlights un-filtered for counts
    const [sortOrder, setSortOrder] = useState('newest');
    const [filterColor, setFilterColor] = useState('all');
    const [bibleData, setBibleData] = useState(null);
    const [titlesData, setTitlesData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        if (!inModal) {
            document.title = `Highlights | ${getTranslation().siteTitle}`;
        }

        const fetchData = async () => {
            try {
                const [titles, bible] = await Promise.all([
                    getCacheData('cache', siteConfig().titleurl).then(cached => cached || axios.get(siteConfig().titleurl).then(res => res.data)),
                    getCacheData('cache', getBible()).then(cached => cached || axios.get(getBible()).then(res => res.data))
                ]);

                if (titles) {
                    addDataIntoCache('cache', siteConfig().titleurl, titles);
                    setTitlesData(titles);
                }
                if (bible) {
                    addDataIntoCache('cache', getBible(), bible);
                    setBibleData(bible);
                }
            } catch (error) {
                console.error("Error loading data for highlights:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        fetchData();
        loadHighlights();

        const unsubscribe = onVerseStorageChange(() => {
            loadHighlights();
        });

        return () => unsubscribe();
    }, [inModal]);

    const loadHighlights = async () => {
        let data = await getHighlights();
        setAllHighlights(data); // Store full list

        // Filter by color
        if (filterColor !== 'all') {
            data = data.filter(h => {
                const details = getHighlightDetails(h);
                return details.color === filterColor;
            });
        }

        // Sort
        if (sortOrder === 'oldest') {
            data.reverse();
        }

        setHighlights(data);
    };

    useEffect(() => {
        loadHighlights();
    }, [sortOrder, filterColor]);

    const getReference = (highlight) => {
        if (!titlesData) return "...";
        const details = getHighlightDetails(highlight);
        const titleObj = titlesData.find(t => String(t.n) == String(details.book));
        const bookName = titleObj
            ? (!getLanguage() || getLanguage() === "Malayalam" ? titleObj.bm : titleObj.be)
            : `Book ${details.book}`;

        const range = formatVerseRange(details.verses);
        return `${bookName} ${details.chapter}:${range}`;
    };

    const getVerseText = (highlight) => {
        if (!bibleData) return "Loading...";
        try {
            const details = getHighlightDetails(highlight);
            const verses = bibleData.filter(v =>
                Number(v.b) == Number(details.book) &&
                Number(v.c) == Number(details.chapter) &&
                details.verses.includes(Number(v.v))
            ).sort((a, b) => Number(a.v) - Number(b.v));

            if (verses.length === 0) return "";
            if (verses.length === 1) {
                return verses[0].t;
            }
            return verses.map(v => `${v.v}. ${v.t}`).join(' ');
        } catch (e) {
            return "";
        }
    };

    const getNavigationPath = (highlight) => {
        const details = getHighlightDetails(highlight);
        const startVerse = details.verses[0];
        const endVerse = details.verses[details.verses.length - 1];
        if (startVerse === endVerse) {
            return `/${details.book}/${details.chapter}/${startVerse}`;
        }
        return `/${details.book}/${details.chapter}/${startVerse}-${endVerse}`;
    };

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleRemove = async (id) => {
        await removeHighlight(id);
        await loadHighlights();
    };

    const baseFontSize = parseInt(localStorage.getItem('fontSize') || 4);
    const displayFontSize = inModal ? 6 : baseFontSize;
    const colors = getHighlightColors();

    return (
        <section className={inModal ? "h-100" : "py-4 mb-5"}>
            <div className={inModal ? "" : "container"}>
                {/* Header */}
                {!inModal && (
                    <div className="text-center mb-4">
                        <h2 className="fw-bold">
                            <span style={{ marginRight: '10px' }}>🖍️</span>
                            Highlights
                        </h2>
                        <p className="text-muted">Your highlighted verses</p>
                    </div>
                )}

                {/* Search and Filter Bar */}
                <div className="row mb-4 g-3 justify-content-end">
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={filterColor}
                            onChange={(e) => setFilterColor(e.target.value)}
                            style={{ borderRadius: '12px' }}
                        >
                            <option value="all">All Colors</option>
                            {colors.map(c => (
                                <option key={c.value} value={c.value}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            style={{ borderRadius: '12px' }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>

                {/* Color Legend */}
                <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center">
                    {colors.map(color => {
                        const count = allHighlights.filter(h => getHighlightDetails(h).color === color.value).length;
                        return (
                            <span
                                key={color.value}
                                className="badge"
                                style={{
                                    backgroundColor: color.value,
                                    color: '#333',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    opacity: filterColor === color.value ? 1 : 0.7,
                                }}
                                onClick={() => setFilterColor(filterColor === color.value ? 'all' : color.value)}
                            >
                                {color.name}: {count}
                            </span>
                        );
                    })}
                </div>

                {/* Highlights List */}
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-info" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : highlights.length === 0 ? (
                    <div className="text-center py-5">
                        <div style={{ fontSize: '4rem', opacity: 0.3 }}>🖍️</div>
                        <p className="text-muted mt-3">
                            {filterColor !== 'all' ? 'No highlights match your filter' : 'No highlights yet'}
                        </p>
                        <Link to="/" className="btn btn-primary mt-2">
                            Start Reading
                        </Link>
                    </div>
                ) : (
                    <div className="row row-cols-1 g-3">
                        {highlights.map((highlight) => {
                            const details = getHighlightDetails(highlight);
                            return (
                                <div key={highlight.id} className="col">
                                    <div
                                        className="card shadow-sm h-100"
                                        style={{
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: details.color,
                                            border: '1px solid rgba(0,0,0,0.1)',
                                            borderLeft: '4px solid rgba(0,0,0,0.2)',
                                        }}
                                    >
                                        <div className="card-body p-3" style={{ color: '#333' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <Link
                                                    to={getNavigationPath(highlight)}
                                                    className="text-decoration-none"
                                                    onClick={onNavigate}
                                                >
                                                    <h6 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>
                                                        {getReference(highlight)}
                                                    </h6>
                                                </Link>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        onClick={() => toggleExpand(highlight.id)}
                                                        className="btn btn-sm border-0"
                                                        title={expandedItems[highlight.id] ? "Hide Verse" : "View Verse"}
                                                        style={{
                                                            borderRadius: '8px',
                                                            backgroundColor: 'rgba(255,255,255,0.4)',
                                                            fontSize: '0.75rem',
                                                            padding: '4px 8px',
                                                            color: '#333',
                                                            fontWeight: '500',
                                                        }}
                                                    >
                                                        {expandedItems[highlight.id] ? "Hide" : "View"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(highlight.id)}
                                                        className="btn btn-sm border-0"
                                                        title="Remove highlight"
                                                        style={{
                                                            borderRadius: '8px',
                                                            backgroundColor: 'rgba(0,0,0,0.1)',
                                                            padding: '4px 8px',
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#333" viewBox="0 0 16 16">
                                                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedItems[highlight.id] && (
                                                <div
                                                    className={`mb-2 fs-${displayFontSize} animate-fade-in`}
                                                    style={{
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: '1.7',
                                                        backgroundColor: 'rgba(255,255,255,0.35)',
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        marginTop: '8px',
                                                    }}
                                                >
                                                    {getVerseText(highlight)}
                                                </div>
                                            )}
                                            <div className="mt-2 d-flex justify-content-between align-items-center">
                                                <small style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                                                    Highlighted on {formatDateTime(details.updatedAt)}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Total count */}
                {highlights.length > 0 && (
                    <div className="text-center mt-4">
                        <small className="text-muted">
                            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Highlights;
