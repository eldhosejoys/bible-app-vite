import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory, getHistoryDetails, onVerseStorageChange } from '../config/VerseStorage';
import { getTranslation } from '../config/SiteTranslations';
import { formatDate, formatTime, formatDateTime, getCacheData, addDataIntoCache, getLanguage } from '../config/Utils';
import { siteConfig, getBible } from '../config/siteConfig';
import axios from 'axios';

function History({ inModal = false, onNavigate }) {
    const [history, setHistory] = useState([]);

    const [bibleData, setBibleData] = useState(null);
    const [titlesData, setTitlesData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        if (!inModal) {
            document.title = `Reading History | ${getTranslation().siteTitle}`;
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
                console.error("Error loading data for history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        fetchData();
        loadHistory();

        const unsubscribe = onVerseStorageChange(() => {
            loadHistory();
        });

        return () => unsubscribe();
    }, [inModal]);

    const loadHistory = async () => {
        const data = await getHistory();
        setHistory(data);
    };

    const getReference = (item) => {
        if (!titlesData) return "...";
        const details = getHistoryDetails(item);
        const titleObj = titlesData.find(t => String(t.n) == String(details.book));
        const bookName = titleObj
            ? (!getLanguage() || getLanguage() === "Malayalam" ? titleObj.bm : titleObj.be)
            : `Book ${details.book}`;

        if (details.startVerse && details.endVerse && details.startVerse !== details.endVerse) {
            return `${bookName} ${details.chapter}:${details.startVerse}-${details.endVerse}`;
        } else if (details.verse) {
            return `${bookName} ${details.chapter}:${details.verse}`;
        }
        return `${bookName} ${details.chapter}`;
    };

    const getVerseText = (item) => {
        if (!bibleData) return "Loading...";
        const details = getHistoryDetails(item);
        if (!details.verse) return "Visited this chapter";
        try {
            // Handle verse ranges
            if (details.startVerse && details.endVerse && details.startVerse !== details.endVerse) {
                const verses = bibleData.filter(v =>
                    Number(v.b) == Number(details.book) &&
                    Number(v.c) == Number(details.chapter) &&
                    Number(v.v) >= details.startVerse &&
                    Number(v.v) <= details.endVerse
                ).sort((a, b) => Number(a.v) - Number(b.v));

                if (verses.length === 0) return "";
                return verses.map(v => `${v.v}. ${v.t}`).join(' ');
            }

            // Single verse
            const v = bibleData.find(v =>
                Number(v.b) == Number(details.book) &&
                Number(v.c) == Number(details.chapter) &&
                Number(v.v) == Number(details.verse)
            );
            return v ? v.t : "";
        } catch (e) {
            return "";
        }
    };

    const getNavigationPath = (item) => {
        const details = getHistoryDetails(item);
        if (details.startVerse && details.endVerse && details.startVerse !== details.endVerse) {
            return `/${details.book}/${details.chapter}/${details.startVerse}-${details.endVerse}`;
        } else if (details.verse) {
            return `/${details.book}/${details.chapter}/${details.verse}`;
        }
        return `/${details.book}/${details.chapter}`;
    };

    const toggleExpand = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleClearHistory = async () => {
        await clearHistory();
        await loadHistory();
    };

    // Group history by date
    const groupHistoryByDate = () => {
        const grouped = {};
        history.forEach(item => {
            const details = getHistoryDetails(item);
            const dateStr = formatDate(details.viewedAt);
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(item);
        });
        return grouped;
    };

    const baseFontSize = parseInt(localStorage.getItem('fontSize') || 4);
    const verseFontSize = inModal ? 6 : baseFontSize;
    const groupedHistory = groupHistoryByDate();

    return (
        <section className={inModal ? "h-100" : "py-4 mb-5"}>
            <div className={inModal ? "" : "container"}>
                {/* Header */}
                {!inModal && (
                    <div className="text-center mb-4">
                        <h2 className="fw-bold">
                            <span style={{ marginRight: '10px' }}>📖</span>
                            Reading History
                        </h2>
                        <p className="text-muted">Verses you've recently read</p>
                    </div>
                )}

                {/* Search and Actions Bar */}
                <div className="row mb-4 g-3 align-items-center justify-content-end">
                    <div className="col-md-6 text-end">
                        {history.length > 0 && (
                            <button
                                onClick={handleClearHistory}
                                className="btn btn-outline-danger btn-sm"
                                style={{ borderRadius: '10px' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="me-1">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                </svg>
                                Clear History
                            </button>
                        )}
                    </div>
                </div>

                {/* History List */}
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-5">
                        <div style={{ fontSize: '4rem', opacity: 0.3 }}>📖</div>
                        <p className="text-muted mt-3">No reading history yet</p>
                        <Link to="/" className="btn btn-primary mt-2">
                            Start Reading
                        </Link>
                    </div>
                ) : (
                    // Grouped by date view
                    Object.entries(groupedHistory).map(([date, items]) => (
                        <div key={date} className="mb-4">
                            <h6 className="text-muted mb-3 fw-bold">
                                <span className="badge bg-secondary me-2">{items.length}</span>
                                {date === formatDate(new Date()) ? 'Today' :
                                    date === formatDate(new Date(Date.now() - 86400000)) ? 'Yesterday' : date}
                            </h6>
                            <div className="row row-cols-1 g-3">
                                {items.map((item, index) => (
                                    <div key={`${item.id}-${index}`} className="col">
                                        <div
                                            className="card shadow-sm h-100"
                                            style={{
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                transition: 'all 0.2s ease',
                                                backgroundColor: 'var(--bs-card-bg)',
                                                border: '1px solid var(--bs-border-color)',
                                                borderLeft: '4px solid #6c757d',
                                            }}
                                        >
                                            <div className="card-body p-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <Link
                                                        to={getNavigationPath(item)}
                                                        className="text-decoration-none"
                                                        onClick={onNavigate}
                                                    >
                                                        <h6 className="fw-bold mb-0 text-secondary">
                                                            {getReference(item)}
                                                        </h6>
                                                    </Link>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <button
                                                            onClick={(e) => toggleExpand(e, item.id)}
                                                            className="btn btn-sm btn-outline-secondary border-0"
                                                            style={{
                                                                borderRadius: '8px',
                                                                backgroundColor: 'rgba(108, 117, 125, 0.08)',
                                                                fontSize: '0.75rem',
                                                                padding: '4px 8px',
                                                                fontWeight: '500',
                                                            }}
                                                        >
                                                            {expandedItems[item.id] ? "Hide" : "View"}
                                                        </button>
                                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {formatTime(getHistoryDetails(item).viewedAt)}
                                                        </small>
                                                    </div>
                                                </div>
                                                {expandedItems[item.id] && (
                                                    <div
                                                        className={`text-muted small mb-0 mt-2 fs-${verseFontSize} animate-fade-in`}
                                                        style={{
                                                            backgroundColor: 'rgba(108, 117, 125, 0.05)',
                                                            padding: '12px',
                                                            borderRadius: '12px',
                                                            whiteSpace: 'pre-wrap',
                                                            border: '1px solid rgba(108, 117, 125, 0.1)'
                                                        }}
                                                    >
                                                        {getVerseText(item)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))

                )}

                {/* Total count */}
                {history.length > 0 && (
                    <div className="text-center mt-4">
                        <small className="text-muted">
                            {history.length} item{history.length !== 1 ? 's' : ''} in history
                        </small>
                    </div>
                )}
            </div>
        </section>
    );
}

export default History;
