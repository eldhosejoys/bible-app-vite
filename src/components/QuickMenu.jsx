import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBookmarks, getNotes, getHighlights, getHistory, onVerseStorageChange } from '../config/VerseStorage';

/**
 * QuickMenu - Floating quick access menu for Bookmarks, Notes, Highlights, History
 */
function QuickMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const [counts, setCounts] = useState({ bookmarks: 0, notes: 0, highlights: 0, history: 0 });

    useEffect(() => {
        const fetchCounts = async () => {
            const [b, n, h, hi] = await Promise.all([
                getBookmarks(),
                getNotes(),
                getHighlights(),
                getHistory()
            ]);
            setCounts({
                bookmarks: b.length,
                notes: n.length,
                highlights: h.length,
                history: hi.length
            });
        };
        fetchCounts();

        // Subscribe to storage changes
        const unsubscribe = onVerseStorageChange(() => {
            fetchCounts();
        });

        return () => unsubscribe();
    }, [isOpen, location]);

    const menuItems = [
        {
            path: '/bookmarks',
            icon: '🔖',
            label: 'Bookmarks',
            count: counts.bookmarks,
            color: '#ffc107'
        },
        {
            path: '/notes',
            icon: '📝',
            label: 'Notes',
            count: counts.notes,
            color: '#17a2b8'
        },
        {
            path: '/highlights',
            icon: '🖍️',
            label: 'Highlights',
            count: counts.highlights,
            color: '#28a745'
        },
        {
            path: '/history',
            icon: '📖',
            label: 'History',
            count: counts.history,
            color: '#6c757d'
        },
    ];

    // Don't show on feature pages
    const featurePages = ['/bookmarks', '/notes', '/highlights', '/history'];
    if (featurePages.includes(location.pathname)) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        zIndex: 1040,
                        backdropFilter: 'blur(2px)',
                    }}
                />
            )}

            {/* Menu Items */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                    zIndex: 1050,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: '12px',
                    transition: 'all 0.3s ease',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                }}
            >
                {menuItems.map((item, index) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            backgroundColor: 'var(--bs-body-bg, #1a1a2e)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            color: 'var(--bs-body-color, #fff)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease',
                            transitionDelay: `${index * 50}ms`,
                            transform: isOpen ? 'translateX(0)' : 'translateX(20px)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(-5px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                        }}
                    >
                        <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                        <span style={{ fontWeight: '500' }}>{item.label}</span>
                        {item.count > 0 && (
                            <span
                                className="badge"
                                style={{
                                    backgroundColor: item.color,
                                    color: '#fff',
                                    fontSize: '0.7rem',
                                    borderRadius: '10px',
                                    padding: '3px 8px',
                                }}
                            >
                                {item.count > 99 ? '99+' : item.count}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Main FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isOpen ? '#dc3545' : '#0d6efd',
                    color: '#fff',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    zIndex: 1050,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1.1)' : 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = isOpen ? 'rotate(45deg)' : 'scale(1)';
                }}
                title={isOpen ? 'Close menu' : 'Open menu'}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                >
                    {isOpen ? (
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                    ) : (
                        <>
                            <path d="M3 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0v.006c0 .07 0 .27-.038.494H15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 14.5V7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.038A2.968 2.968 0 0 1 3 2.506V2.5zm1.068.5H7v-.5a1.5 1.5 0 1 0-3 0c0 .085.002.274.045.43a.522.522 0 0 0 .023.07zM9 3h2.932a.56.56 0 0 0 .023-.07c.043-.156.045-.345.045-.43a1.5 1.5 0 0 0-3 0V3zM1 4v2h6V4H1zm8 0v2h6V4H9zm5 3H9v8h4.5a.5.5 0 0 0 .5-.5V7zm-7 8V7H2v7.5a.5.5 0 0 0 .5.5H7z" />
                        </>
                    )}
                </svg>
            </button>

            {/* Total count badge on FAB */}
            {!isOpen && (counts.bookmarks + counts.notes + counts.highlights) > 0 && (
                <span
                    style={{
                        position: 'fixed',
                        bottom: '60px',
                        right: '15px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        padding: '2px 6px',
                        zIndex: 1051,
                        minWidth: '18px',
                        textAlign: 'center',
                    }}
                >
                    {counts.bookmarks + counts.notes + counts.highlights > 99 ? '99+' : counts.bookmarks + counts.notes + counts.highlights}
                </span>
            )}
        </>
    );
}

export default QuickMenu;
