import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookmarks, removeBookmark, getBookmarkDetails, onVerseStorageChange } from '../config/VerseStorage';
import { getTranslation } from '../config/SiteTranslations';
import { formatDate, formatTime, formatDateTime, getCacheData, addDataIntoCache, getLanguage, formatVerseRange } from '../config/Utils';
import { siteConfig, getBible } from '../config/siteConfig';
import axios from 'axios';

function Bookmarks({ inModal = false, onNavigate }) {
    const [bookmarks, setBookmarks] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest
    const [bibleData, setBibleData] = useState(null);
    const [titlesData, setTitlesData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        if (!inModal) {
            document.title = `Bookmarks | ${getTranslation().siteTitle}`;
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
                console.error("Error loading data for bookmarks:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        fetchData();
        loadBookmarks();

        const unsubscribe = onVerseStorageChange(() => {
            loadBookmarks();
        });

        return () => unsubscribe();
    }, [inModal]);

    const loadBookmarks = async () => {
        const data = await getBookmarks();
        if (sortOrder === 'oldest') {
            data.reverse();
        }
        setBookmarks(data);

        // Default expanded for bookmarks
        const initialExpanded = {};
        data.forEach(item => {
            initialExpanded[item.id] = true;
        });
        setExpandedItems(initialExpanded);
    };

    useEffect(() => {
        loadBookmarks();
    }, [sortOrder]);

    const getReference = (bookmark) => {
        if (!titlesData) return "...";
        const details = getBookmarkDetails(bookmark);
        const titleObj = titlesData.find(t => String(t.n) == String(details.book));
        const bookName = titleObj
            ? (!getLanguage() || getLanguage() === "Malayalam" ? titleObj.bm : titleObj.be)
            : `Book ${details.book}`;

        const range = formatVerseRange(details.verses);
        return `${bookName} ${details.chapter}:${range}`;
    };

    const getVerseText = (bookmark) => {
        if (!bibleData) return "Loading...";
        try {
            const details = getBookmarkDetails(bookmark);
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

    const getNavigationPath = (bookmark) => {
        const details = getBookmarkDetails(bookmark);
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
        await removeBookmark(id);
        await loadBookmarks();
    };

    const baseFontSize = parseInt(localStorage.getItem('fontSize') || 4);
    const displayFontSize = inModal ? 6 : baseFontSize;
    const currentLanguage = getLanguage();

    return (
        <section className={inModal ? "h-100" : "py-4 mb-5"}>
            <div className={inModal ? "" : "container"}>
                {/* Header */}
                {!inModal && (
                    <div className="text-center mb-4">
                        <h2 className="fw-bold">
                            <span style={{ marginRight: '10px' }}>🔖</span>
                            Bookmarks
                        </h2>
                        <p className="text-muted">Your saved verses</p>
                    </div>
                )}

                {/* Search and Filter Bar */}
                <div className="row mb-4 g-3 justify-content-end">
                    <div className="col-md-4">
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

                {/* Bookmarks List */}
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="text-center py-5">
                        <div style={{ fontSize: '4rem', opacity: 0.3 }}>🔖</div>
                        <p className="text-muted mt-3">No bookmarks yet</p>
                        <Link to="/" className="btn btn-primary mt-2">
                            Start Reading
                        </Link>
                    </div>
                ) : (
                    <div className="row row-cols-1 g-3">
                        {bookmarks.map((bookmark) => (
                            <div key={bookmark.id} className="col">
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
                                                to={getNavigationPath(bookmark)}
                                                className="text-decoration-none"
                                                onClick={onNavigate}
                                            >
                                                <h6 className="fw-bold mb-0 text-secondary">
                                                    {getReference(bookmark)}
                                                </h6>
                                            </Link>
                                            <div className="d-flex gap-2">
                                                <button
                                                    onClick={() => toggleExpand(bookmark.id)}
                                                    className="btn btn-sm btn-outline-secondary border-0"
                                                    title={expandedItems[bookmark.id] ? "Hide Verse" : "View Verse"}
                                                    style={{
                                                        borderRadius: '8px',
                                                        backgroundColor: 'rgba(108, 117, 125, 0.08)',
                                                        fontSize: '0.75rem',
                                                        padding: '4px 8px',
                                                        fontWeight: '500',
                                                    }}
                                                >
                                                    {expandedItems[bookmark.id] ? "Hide" : "View"}
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(bookmark.id)}
                                                    className="btn btn-sm btn-outline-danger border-0"
                                                    title="Remove bookmark"
                                                    style={{
                                                        borderRadius: '8px',
                                                        backgroundColor: 'rgba(220, 53, 69, 0.08)',
                                                        padding: '4px 8px',
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {expandedItems[bookmark.id] && (
                                            <div
                                                className={`mb-2 fs-${displayFontSize} animate-fade-in`}
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: '1.7',
                                                    backgroundColor: 'rgba(108, 117, 125, 0.05)',
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    marginTop: '8px',
                                                    border: '1px solid rgba(108, 117, 125, 0.1)'
                                                }}
                                            >
                                                {getVerseText(bookmark)}
                                            </div>
                                        )}
                                        <div className="mt-2 d-flex justify-content-between align-items-center">
                                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                Bookmarked on {formatDateTime(getBookmarkDetails(bookmark).createdAt)}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Total count */}
                {bookmarks.length > 0 && (
                    <div className="text-center mt-4">
                        <small className="text-muted">
                            {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Bookmarks;
