import { Link } from "react-router-dom";
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Tab from 'react-bootstrap/Tab';
import Nav from 'react-bootstrap/Nav';
import { getTranslation } from '../config/SiteTranslations';
import { handleFontSize, handleCompact, getCacheData, getLanguage, setLanguage } from '../config/Utils';
import { clearHistory, clearAllNotes, clearAllHighlights, clearAllBookmarks, clearAllData, getBookmarks, getNotes, getHighlights, getHistory, countBookmarks, countNotes, countHighlights, countHistory, onVerseStorageChange } from '../config/VerseStorage';
import Notes from '../components/Notes';
import Highlights from '../components/Highlights';
import History from '../components/History';
import Bookmarks from '../components/Bookmarks';

function Settings() {
  const [showModal, setShowModal] = useState(false);
  const handleCloseModal = () => setShowModal(false);
  const handleShowModal = () => setShowModal(true);

  const fetchCounts = async () => {
    try {
      const [b, n, h, hist] = await Promise.all([
        countBookmarks(),
        countNotes(),
        countHighlights(),
        countHistory()
      ]);
      setCounts({
        bookmarks: b,
        notes: n,
        highlights: h,
        history: hist,
      });
    } catch (e) {
      console.error("Failed to load counts", e);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchCounts();
      const unsubscribe = onVerseStorageChange(() => {
        fetchCounts();
      });
      return () => unsubscribe();
    }
  }, [showModal]);

  const [theme, setTheme] = useState('light');
  const [bibleLanguage, setBibleLanguage] = useState('Malayalam');
  const [fontSize, setFontSize] = useState(6);
  const [isThemeChecked, setIsThemeChecked] = useState(false);
  const [isCompactChecked, setIsCompactChecked] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [counts, setCounts] = useState({ bookmarks: 0, notes: 0, highlights: 0, history: 0 });

  useEffect(() => {
    const currentTheme = localStorage.getItem('theme');
    setTheme(currentTheme || 'light');
    setIsThemeChecked(currentTheme === 'dark');
    if (!currentTheme) {
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
      setIsThemeChecked(true);
    }
    document.documentElement.setAttribute('data-bs-theme', currentTheme || 'dark');
    initializeLanguageFromQuery();

    const fontSizeValue = localStorage.getItem('fontSize');
    setFontSize(fontSizeValue || 4);
    if (!fontSizeValue) {
      localStorage.setItem('fontSize', 4);
      setFontSize(4);
    }

    const compact = localStorage.getItem('compact');
    setIsCompactChecked(compact === 'true');

    const showRefs = localStorage.getItem('showReferences');
    setShowReferences(showRefs === 'true');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new Event('themeChange'));
    const darkSwitch = document.getElementById('darkSwitch');
    if (darkSwitch) darkSwitch.checked = newTheme === 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    setIsThemeChecked(newTheme === 'dark');

    // Update heading colors based on theme
    const elements = document.querySelectorAll('.heading-color');
    elements.forEach(el => {
      if (newTheme === 'light') {
        el.classList.add('text-warning');
        el.classList.remove('text-danger');
      } else {
        el.classList.remove('text-warning');
        el.classList.add('text-danger');
      }
    });
  };

  const toggleLanguage = (e) => {
    const confirmed = window.confirm('Are you sure you want to change Language?');
    if (confirmed) {
      const newLanguage = e.target.value;
      setBibleLanguage(newLanguage);
      setLanguage(newLanguage);
      window.location.reload();
    }
  };

  const initializeLanguageFromQuery = () => {
    const supportedLanguages = ['English', 'Malayalam', 'Tamil', 'Telugu', 'Hindi'];
    const urlParams = new URLSearchParams(window.location.search);
    const queryLang = urlParams.get('lang')?.replace(/^\w/, c => c.toUpperCase());
    const currentBibleLanguage = getLanguage();

    if (!currentBibleLanguage && (!queryLang || !supportedLanguages.includes(queryLang))) {
      setLanguage('Malayalam');
      setBibleLanguage('Malayalam');
    } else if (queryLang && supportedLanguages.includes(queryLang)) {
      setBibleLanguage(queryLang);
      setLanguage(queryLang);
    } else {
      setBibleLanguage(currentBibleLanguage);
      setLanguage(currentBibleLanguage);
    }
  };

  const toggleCompact = () => {
    const newValue = !isCompactChecked;
    setIsCompactChecked(newValue);
    handleCompact(newValue);
    window.dispatchEvent(new Event('settingsChange'));
  };

  const toggleShowReferences = () => {
    const newShowState = !showReferences;
    setShowReferences(newShowState);
    if (newShowState) {
      localStorage.setItem('showReferences', 'true');
    } else {
      localStorage.removeItem('showReferences');
    }
    window.location.reload();
  };

  const handleClearCache = async (type) => {
    let message = '';
    let action = null;

    switch (type) {
      case 'history':
        message = 'Clear reading history?';
        action = clearHistory;
        break;
      case 'notes':
        message = 'Delete ALL notes? This cannot be undone.';
        action = clearAllNotes;
        break;
      case 'highlights':
        message = 'Remove ALL highlights? This cannot be undone.';
        action = clearAllHighlights;
        break;
      case 'bookmarks':
        message = 'Remove ALL bookmarks? This cannot be undone.';
        action = clearAllBookmarks;
        break;
      case 'all':
        message = 'Reset entire application? This will clear all data including downloaded content and settings.';
        action = async () => {
          await clearAllData(); // Clear IndexedDB
          await caches.delete('cache');
          await caches.delete('content');
          localStorage.clear();
          return { success: true };
        };
        break;
      default:
        return;
    }

    if (window.confirm(message)) {
      const result = await action();
      if (result && result.success) {
        if (type === 'all') {
          window.location.reload();
        } else {
          // Optional: show a toast or alert
        }
      }
    }
  };

  const handleFontSizeChange = (event) => {
    setFontSize(7 - event);
    handleFontSize(event);
    window.dispatchEvent(new Event('settingsChange'));
  };

  const randomVerse = async () => {
    const a = await getCacheData('cache', "/assets/json/bible.json");
    if (a) {
      const randomVerse = a[Math.floor(Math.random() * a.length)];
      if (randomVerse) {
        window.history.pushState(null, '', `/${randomVerse.b}/${randomVerse.c}/${randomVerse.v}`);
        window.dispatchEvent(new Event('popstate'));
      }
    } else {
      const array = ["/43/3/16", "/23/53/4", "/44/2/22", "/45/3/25", "/45/10/9", "/60/1/21"];
      window.history.pushState(null, '', array[Math.floor(Math.random() * array.length)]);
      window.dispatchEvent(new Event('popstate'));
    }
    setShowModal(false);
  };

  return (
    <>
      <style>
        {`
          .glass-modal .modal-content {
            background-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(33, 37, 41, 0.95)'};
            backdrop-filter: blur(10px);
            border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
            color: ${theme === 'light' ? '#000' : '#fff'};
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            overflow: hidden;
          }
          .glass-modal .modal-header {
            border-bottom: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
            padding: 0.75rem 1.5rem;
          }
          .glass-modal .modal-footer {
            border-top: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
          }

          /* General Nav Styles */
          .glass-modal .nav-pills .nav-link {
            color: ${theme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'};
            border-radius: 8px;
            margin-bottom: 0.5rem;
            text-align: left;
            padding: 10px 15px;
            transition: all 0.2s;
            width: 100%;
            font-weight: 500;
          }
           .glass-modal .nav-pills .nav-link:hover {
            background-color: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'};
            color: ${theme === 'light' ? '#000' : '#fff'};
            transform: translateX(3px);
          }
          .glass-modal .nav-pills .nav-link.active {
            background-color: #8D9EFF;
            color: #fff;
            box-shadow: 0 4px 15px rgba(141, 158, 255, 0.4);
          }
          
          .settings-section-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'};
            margin-bottom: 1rem;
            font-weight: 600;
          }

          /* Screen Size Specifics */
          /* Mobile view: below 690px */
          @media (max-width: 689.98px) {
            .settings-desktop-only {
              display: none !important;
            }
            .glass-modal .modal-body {
              min-height: auto !important;
              height: 100%;
            }
            .mobile-nav-container {
               overflow-x: auto;
               white-space: nowrap;
               padding-bottom: 5px;
               margin-bottom: 0; 
               background-color: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)'};
               padding: 10px;
               border-bottom: 1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};
               flex-shrink: 0;
            }
            .glass-modal .nav-pills {
               flex-direction: row;
               gap: 10px;
            }
            .glass-modal .nav-pills .nav-item {
               display: inline-block;
            }
            .glass-modal .nav-pills .nav-link {
                margin-bottom: 0;
                padding: 6px 14px;
                border-radius: 20px;
                background-color: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
                font-size: 0.85rem;
                white-space: nowrap;
            }
            .glass-modal .nav-pills .nav-link.active {
                background-color: #8D9EFF;
                color: #fff !important;
            }
            .settings-content-area {
                padding: 1rem !important;
                flex: 1 1 auto;
                height: 0; 
            }
          }
          
          /* Desktop Mode: 690px and up */
          @media (min-width: 690px) {
             .settings-mobile-only {
               display: none !important;
             }
             .glass-modal.modal-dialog {
                min-width: 690px;
             }
             .settings-content-area {
                height: 100%;
                overflow-y: auto;
             }
             .glass-modal .modal-body {
                height: 600px;
                overflow: hidden;
             }
             .settings-layout-container {
                flex-direction: row !important;
             }
          }
        `}
      </style>

      <Button variant="primary" onClick={handleShowModal} size="sm" className="rounded-end">⚙️</Button>

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        size="lg"
        centered
        dialogClassName="glass-modal"
        fullscreen="sm-down"
        scrollable={false}
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold">Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Tab.Container id="settings-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            {/* Custom Flex Layout instead of Bootstrap Grid for better control */}
            <div className="d-flex h-100 flex-column settings-layout-container">

              {/* Desktop Sidebar - Fixed Width */}
              <div
                className="settings-desktop-only d-flex flex-column border-end py-3 px-2"
                style={{
                  width: '160px',
                  flexShrink: 0,
                  borderColor: theme === 'light' ? 'rgba(0,0,0,0.06) !important' : 'rgba(255,255,255,0.05) !important',
                  background: theme === 'light' ? 'rgba(248, 249, 250, 0.5)' : 'rgba(0,0,0,0.15)'
                }}
              >
                <Nav variant="pills" className="flex-column gap-1">
                  <Nav.Item>
                    <Nav.Link eventKey="general" className="d-flex align-items-center gap-2">
                      <i className="bi bi-gear" style={{ fontSize: '1.1rem' }}></i> General
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="bookmarks" className="d-flex align-items-center gap-2 justify-content-between">
                      <span className="d-flex align-items-center gap-2">
                        <i className="bi bi-bookmark" style={{ fontSize: '1.1rem' }}></i> Bookmarks
                      </span>
                      {counts.bookmarks > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{counts.bookmarks}</span>}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="notes" className="d-flex align-items-center gap-2 justify-content-between">
                      <span className="d-flex align-items-center gap-2">
                        <i className="bi bi-journal-text" style={{ fontSize: '1.1rem' }}></i> Notes
                      </span>
                      {counts.notes > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{counts.notes}</span>}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="highlights" className="d-flex align-items-center gap-2 justify-content-between">
                      <span className="d-flex align-items-center gap-2">
                        <i className="bi bi-highlighter" style={{ fontSize: '1.1rem' }}></i> Highlights
                      </span>
                      {counts.highlights > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{counts.highlights}</span>}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="history" className="d-flex align-items-center gap-2 justify-content-between">
                      <span className="d-flex align-items-center gap-2">
                        <i className="bi bi-clock-history" style={{ fontSize: '1.1rem' }}></i> History
                      </span>
                      {counts.history > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{counts.history}</span>}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="data" className="d-flex align-items-center gap-2">
                      <i className="bi bi-database" style={{ fontSize: '1.1rem' }}></i> Data
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>

              {/* Content Area */}
              <div className="d-flex flex-column h-100 flex-grow-1" style={{ minWidth: 0 }}>
                {/* Mobile Top Nav */}
                <div className="settings-mobile-only mobile-nav-container">
                  <Nav variant="pills" className="flex-nowrap">
                    <Nav.Link eventKey="general">General</Nav.Link>
                    <Nav.Link eventKey="bookmarks">
                      Bookmarks {counts.bookmarks > 0 && <span style={{ opacity: 0.6 }}>({counts.bookmarks})</span>}
                    </Nav.Link>
                    <Nav.Link eventKey="notes">
                      Notes {counts.notes > 0 && <span style={{ opacity: 0.6 }}>({counts.notes})</span>}
                    </Nav.Link>
                    <Nav.Link eventKey="highlights">
                      Highlights {counts.highlights > 0 && <span style={{ opacity: 0.6 }}>({counts.highlights})</span>}
                    </Nav.Link>
                    <Nav.Link eventKey="history">
                      History {counts.history > 0 && <span style={{ opacity: 0.6 }}>({counts.history})</span>}
                    </Nav.Link>
                    <Nav.Link eventKey="data">Data</Nav.Link>
                  </Nav>
                </div>

                <div className="p-4 settings-content-area" style={{ overflowY: 'auto', flex: 1 }}>
                  <Tab.Content>
                    <Tab.Pane eventKey="general">
                      <h5 className="mb-4 fw-bold">General Settings</h5>

                      <div className="mb-4">
                        <div className="settings-section-title">Appearance</div>
                        <div className={`${theme === 'light' ? 'bg-light border-0 shadow-sm' : 'bg-dark bg-opacity-50 border border-secondary border-opacity-25'} p-3 rounded-3 mb-3`}>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <label className="form-check-label" htmlFor="darkSwitch">Dark Mode</label>
                            <div className="form-check form-switch m-0">
                              <input className="form-check-input" type="checkbox" checked={isThemeChecked} onChange={toggleTheme} id="darkSwitch" />
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <label className="form-check-label" htmlFor="compactSwitch">Compact Mode</label>
                            <div className="form-check form-switch m-0">
                              <input className="form-check-input" type="checkbox" checked={isCompactChecked} onChange={toggleCompact} id="compactSwitch" />
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <label className="form-check-label" htmlFor="referencesSwitch">Show References</label>
                            <div className="form-check form-switch m-0">
                              <input className="form-check-input" type="checkbox" checked={showReferences} onChange={toggleShowReferences} id="referencesSwitch" />
                            </div>
                          </div>
                        </div>

                        <div className={`${theme === 'light' ? 'bg-light border-0 shadow-sm' : 'bg-dark bg-opacity-50 border border-secondary border-opacity-25'} p-3 rounded-3`}>
                          <label htmlFor="font-size-range" className="form-label mb-2">Font Size: {fontSize}</label>
                          <input
                            type="range"
                            className="form-range"
                            min="1"
                            max="6"
                            id="font-size-range"
                            onChange={(event) => handleFontSizeChange(event.target.value)}
                            value={7 - fontSize}
                          />
                          <div className="d-flex justify-content-between text-muted small">
                            <span>Small</span>
                            <span>Large</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="settings-section-title">Language</div>
                        <div className={`${theme === 'light' ? 'bg-light border-0 shadow-sm' : 'bg-dark bg-opacity-50 border border-secondary border-opacity-25'} p-3 rounded-3`}>
                          <label className="form-label mb-2" htmlFor="lanSwitch">Bible Language</label>
                          <select
                            className={`form-select ${theme === 'light' ? 'bg-white text-dark border-secondary' : 'bg-dark text-light border-secondary'}`}
                            value={bibleLanguage}
                            onChange={toggleLanguage}
                            id="lanSwitch"
                          >
                            <option value="Malayalam">Malayalam</option>
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Telugu">Telugu</option>
                          </select>
                        </div>
                      </div>


                    </Tab.Pane>

                    <Tab.Pane eventKey="bookmarks" className="h-100">
                      <Bookmarks inModal={true} onNavigate={handleCloseModal} />
                    </Tab.Pane>

                    <Tab.Pane eventKey="notes" className="h-100">
                      <Notes inModal={true} onNavigate={handleCloseModal} />
                    </Tab.Pane>

                    <Tab.Pane eventKey="highlights" className="h-100">
                      <Highlights inModal={true} onNavigate={handleCloseModal} />
                    </Tab.Pane>

                    <Tab.Pane eventKey="history" className="h-100">
                      <History inModal={true} onNavigate={handleCloseModal} />
                    </Tab.Pane>

                    <Tab.Pane eventKey="data">
                      <h5 className="mb-4 fw-bold">Data & Storage</h5>

                      <div
                        className="d-flex align-items-center p-3 mb-4"
                        style={{
                          backgroundColor: 'rgba(13, 110, 253, 0.04)',
                          borderRadius: '12px',
                          border: '1px solid rgba(13, 110, 253, 0.1)',
                          color: '#0d6efd'
                        }}
                      >
                        <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', backgroundColor: 'rgba(13, 110, 253, 0.1)', borderRadius: '50%' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                          </svg>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.9 }}>
                          Manage your local data here. <span style={{ opacity: 0.7 }}>Clearing data cannot be undone.</span>
                        </div>
                      </div>

                      <div className={`${theme === 'light' ? 'bg-light border-0 shadow-sm' : 'bg-dark bg-opacity-50 border border-secondary border-opacity-25'} p-3 rounded-3 mb-3`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">History</h6>
                            <small className="text-muted">Recently viewed verses</small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleClearCache('history')}
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Clear History
                          </Button>
                        </div>
                        <hr className="border-secondary opacity-25" />

                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">Bookmarks</h6>
                            <small className="text-muted">All saved bookmarks</small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleClearCache('bookmarks')}
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Delete All Bookmarks
                          </Button>
                        </div>
                        <hr className="border-secondary opacity-25" />

                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">Notes</h6>
                            <small className="text-muted">All personal notes</small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleClearCache('notes')}
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Delete All Notes
                          </Button>
                        </div>
                        <hr className="border-secondary opacity-25" />

                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">Highlights</h6>
                            <small className="text-muted">All colored highlights</small>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleClearCache('highlights')}
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Delete All Highlights
                          </Button>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-top border-secondary border-opacity-25">
                        <h6 className="text-danger opacity-75 fw-bold mb-3" style={{ fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Danger Zone</h6>
                        <div className={`${theme === 'light' ? 'bg-light border-0 shadow-sm' : 'bg-dark bg-opacity-50 border border-secondary border-opacity-25'} p-3 rounded-3 d-flex justify-content-between align-items-center`}>
                          <div>
                            <strong className={theme === 'light' ? 'text-dark' : 'text-light'}>Reset Application</strong>
                            <div className="text-muted small">Clears all settings, cache, and downloaded data. App will reload.</div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleClearCache('all')}
                            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: '500' }}
                          >
                            Reset Everything
                          </Button>
                        </div>
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </div>
              </div>
            </div>
          </Tab.Container>
        </Modal.Body>
        <Modal.Footer className="justify-content-center pt-2 pb-2" style={{
          borderTop: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
          backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
        }}>
          <div className="d-flex gap-4 align-items-center" style={{ opacity: 0.9 }}>
            <Button
              variant="link"
              className="text-decoration-none p-0 border-0 d-flex align-items-center gap-2"
              onClick={randomVerse}
              style={{ fontSize: '0.85rem', color: 'inherit', fontWeight: 500 }}
            >
              <i className="bi bi-shuffle"></i> Random Verse
            </Button>
            <span className="opacity-25">|</span>
            <Link
              to="/about"
              className="text-decoration-none d-flex align-items-center gap-2"
              onClick={handleCloseModal}
              style={{ fontSize: '0.85rem', color: 'inherit', fontWeight: 500 }}
            >
              <i className="bi bi-info-circle"></i> About
            </Link>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Settings;