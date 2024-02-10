import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { getTranslation } from '../config/SiteTranslations';
import { handleFontSize, handleCompact, getCacheData } from '../config/Utils';


function Settings() {

  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const handleCloseModal = () => setShowModal(false);
  const handleShowModal = () => setShowModal(true);

  const [theme, setTheme] = useState('light');
  const [bibleLanguage, setBibleLanguage] = useState('Malayalam');
  const [isLanguageChecked, setIsLanguageChecked] = useState(false);
  const [fontSize, setFontSize] = useState(6);
  const [isThemeChecked, setIsThemeChecked] = useState(false);
  const [isCompactChecked, setIsCompactChecked] = useState(false);

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


    const currentBibleLanguage = localStorage.getItem('bible-language');
    setBibleLanguage(currentBibleLanguage || 'Malayalam');
    setIsLanguageChecked(currentBibleLanguage === 'English');
    if (!currentBibleLanguage) {
      localStorage.setItem('bible-language', 'Malayalam');
      setBibleLanguage('Malayalam');
      setIsLanguageChecked(false);
    }

    const fontSizeValue = localStorage.getItem('fontSize');
    setFontSize(fontSizeValue || 5);
    if (!fontSizeValue) {
      localStorage.setItem('fontSize', 5);
      setFontSize(5);
    }

    const compact = localStorage.getItem('compact');
    setIsCompactChecked(compact === 'true' ? true : false);
    if (!compact) {
      setIsCompactChecked(false);
      localStorage.removeItem('compact');
    }

  }, []);

  // useEffect(() => {
  //   const currentFontSize = localStorage.getItem('fontSize');
  //   setFontSize(7-currentFontSize);
  //   handleFontSizeChange(7-currentFontSize); 
  // }, [location]);


  // Define a function to toggle the theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const darkSwitch = document.getElementById('darkSwitch');
    darkSwitch.checked = newTheme === 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    setIsThemeChecked(newTheme === 'light' ? false : true);


    var elements = document.querySelectorAll('.heading-color');
    for (var i = 0; i < elements.length; i++) {
      var classList = elements[i].classList;
      if (theme == 'light') {
        classList.add('text-warning');
        classList.remove('text-danger');
      } else {
        classList.remove('text-warning');
        classList.add('text-danger');
      }
    }

  };

  // Define a function to toggle the theme
  const toggleLanguage = (e) => {
    const confirmed = window.confirm('Are you sure you want to change Language?');
    if (confirmed) {
      const newLanguage = e.target.value; //bibleLanguage === 'Malayalam' ? 'English' : 'Malayalam';
      setBibleLanguage(newLanguage);
      localStorage.setItem('bible-language', newLanguage);

      // const lanSwitch = document.getElementById('lanSwitch');
      // lanSwitch.checked = newLanguage === 'English';
      // setIsLanguageChecked(newLanguage === 'Malayalam' ? false : true);
      window.location.reload();
    }
  };

  // Define a function to toggle the compact
  const toggleCompact = () => {
    setIsCompactChecked(isCompactChecked === true ? false : true);
    handleCompact(isCompactChecked === true ? false : true);
  };

  function handleDeleteCache() {
    const confirmed = window.confirm('Are you sure you want to delete the cache? This will clear all cached content.');
    if (confirmed) {
      caches.delete('cache', 'content');
      localStorage.clear();
      window.location.reload();
    }
  }

  function handleFontSizeChange(event) {
    setFontSize(7 - event);
    handleFontSize(event);
  }

  const randomVerse = () => {
    const biblecontents = async () => {
      const a = await getCacheData('cache', "/assets/json/bible.json");
      if (a) {
        const randomVerse = a[Math.floor(Math.random() * a.length)];
        window.history.pushState(null, '', `/${randomVerse.b}/${randomVerse.c}/${randomVerse.v}`);
        window.dispatchEvent(new Event('popstate'));
      } else {
        const array = ["/43/3/16", "/23/53/4", "/44/2/22", "/45/3/25", "/45/10/9", "/60/1/21"];
        window.history.pushState(null, '', array[Math.floor(Math.random() * array.length)]);
        window.dispatchEvent(new Event('popstate'));
      }
      setShowModal(false);
    };
    biblecontents();

  }

  return (<>
    <Button variant="primary" onClick={handleShowModal} size="sm" className="rounded-end">⚙️</Button>
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton >
        <Modal.Title>Site Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Delete cache: <small className="text-light" onClick={handleDeleteCache} title="clear cache to load fresh content" style={{ cursor: 'pointer' }}>🗑</small>
        <div className="form-check form-switch">
          <label className="form-check-label" for="darkSwitch">Dark Mode</label>
          <input className="form-check-input" type="checkbox" checked={isThemeChecked} onChange={toggleTheme} id="darkSwitch" />
        </div>

        <div className="form-check form-switch">
          <label className="form-check-label" for="compactSwitch">Compact</label>
          <input className="form-check-input" type="checkbox" checked={isCompactChecked} onChange={toggleCompact} id="compactSwitch" />
        </div>

        {/* <div className="form-check form-switch">
          <label className="form-check-label" for="lanSwitch">{bibleLanguage} Language</label>
          <input className="form-check-input" type="checkbox" checked={isLanguageChecked} onChange={toggleLanguage} id="lanSwitch" />
        </div> */}

        <div>
          <label className="form-check-label" for="lanSwitch">Choose Language</label>
          <select className="form-select" value={bibleLanguage} onChange={toggleLanguage} id="lanSwitch2">
            <option value="Malayalam">Malayalam</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Tamil">Tamil</option>
            <option value="Telugu">Telugu</option>
          </select>

        </div>

        <form>
          <div className="form-group row align-middle">
            <label for="font-size-range" className="col-form-label col-auto">Font Size: {fontSize}</label>
            <div className="col-4 pt-2">
              <input type="range" className="form-range" min="1" max="6" id="font-size-range" onChange={(event) => handleFontSizeChange(event.target.value)} value={7 - fontSize} list="font-size-list" />
            </div>
          </div>
        </form>

        <a onClick={randomVerse} className="btn btn-primary btn-sm">random verse</a>



      </Modal.Body>
      <Modal.Footer className="text-start position-start">
        <small>{getTranslation().read}: <Link to={'/about'} onClick={handleCloseModal}>{getTranslation().siteAboutTitle}</Link> </small>
      </Modal.Footer>

    </Modal>
  </>);
}

export default Settings;