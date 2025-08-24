import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { transliterate, getCacheData, getLanguage } from '../config/Utils';
import { siteConfig } from "../config/siteConfig";
import Settings from "../features/Settings";
import IndexButton from "../features/IndexButton";
import { getTranslation } from '../config/SiteTranslations';
import { bookMap } from "../config/siteConfig";

function Header({ value = '' }) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [placeholder, setPlaceholder] = useState(getTranslation().searchPlaceHolder);

  const regInput = useRef();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInput = async (value) => {
    setInput(value);
    if (getLanguage() === 'English' || !value || value.endsWith(" ")) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    const words = value.split(' ');
    const lastWord = words.pop();
    const baseString = words.join(' ');

    const transliterated = await transliterate(lastWord);
    const newSuggestions = Array.from(new Set([
      ...transliterated.map(s => baseString ? `${baseString} ${s}` : s),
      value
    ]));

    setSuggestions(newSuggestions);
    setActiveSuggestion(0);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleKeyDown = (e) => {
    const maxIndex = suggestions.length - 1;

    switch (e.keyCode) {
      case 38: // up
        e.preventDefault();
        setActiveSuggestion(prev => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case 40: // down
        e.preventDefault();
        setActiveSuggestion(prev => (prev < maxIndex ? prev + 1 : 0));
        break;
      case 13: // enter
        e.preventDefault();
        if (showSuggestions && suggestions.length && activeSuggestion >= 0) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        } else {
          navigate(`/search?q=${regInput.current.value}`);
        }
        break;
      case 32: // space
        if (showSuggestions && activeSuggestion >= 0) handleSuggestionClick(suggestions[activeSuggestion]);
        break;
      default:
        break;
    }
  };

  const numExtraKeys = () => {
    const number = parseInt(location.pathname.split("/")[2]);
    return isNaN(number) ? '' : (getTranslation().numExtra[number - 1] || getTranslation().numExtra[3]);
  };

  useEffect(() => {
    setInput(searchParams.get("q") || regInput.current.value);
  }, [searchParams]);

  const setDynamicPlaceholder = async () => {
    const match = location.pathname.match(
      /^\/([a-zA-Z0-9]+)(?:\/(\d+))?(?:[/:](\d+)(?:-(\d+))?)?/
    );
    if (!match) return setPlaceholder(getTranslation().searchPlaceHolder);

    const [, bookPart, chapterNum, verseStart, verseEnd] = match;

    const resp = await getCacheData("cache", siteConfig().titleurl);
    if (!resp) return setPlaceholder(getTranslation().searchPlaceHolder);

    // Determine bookIndex: either from number or from abbreviation
    let bookIndex = Number(bookPart);
    if (!bookIndex) {
      bookIndex = bookMap[bookPart.toLowerCase()];
    }

    if (!bookIndex || !resp[bookIndex - 1]) {
      return setPlaceholder(getTranslation().searchPlaceHolder);
    }

    const text = getLanguage() === "Malayalam"
      ? resp[bookIndex - 1].bm
      : resp[bookIndex - 1].be;

    const placeholder = chapterNum
      ? `${text} : ${chapterNum}${numExtraKeys()} ${getTranslation().chapter}`
      : text;

    setPlaceholder(placeholder);
  };



  useEffect(() => {
    setDynamicPlaceholder();
  }, [location]);

  const resetPlaceholder = () => setPlaceholder(getTranslation().searchPlaceHolder);

  return (
    <nav className="navbar navbar-expand-sm navbar-dark sticky-top" style={{ backgroundColor: "#344955" }}>
      <div className="container justify-content-center mb-2">
        <Link className="navbar-brand" to="/">
          <img
            loading="lazy"
            src="/assets/images/ml-bible.webp"
            alt="ജീവന്റെവചനം മലയാളം"
            style={{ height: "55px", marginTop: "-5px" }}
          />
        </Link>

        <span className="form-inline input-group">
          <input
            ref={regInput}
            className="form-control"
            type="search"
            placeholder={placeholder}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            onFocus={resetPlaceholder}
            onMouseEnter={resetPlaceholder}
            onMouseLeave={setDynamicPlaceholder}
            aria-label="Search"
            name="q"
            required
          />

          {showSuggestions && suggestions.length && getLanguage() !== 'English' && (
            <ul className="suggestion-list">
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  className={i === activeSuggestion ? "active" : ""}
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}

          <Link to={`/search?q=${input}`} className="btn btn-light text-body me-2 rounded-end">
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              className="bi bi-search blink_me"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fillRule="evenodd" d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z" />
              <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
            </svg>
          </Link>
          <IndexButton />
          <Settings />
        </span>
      </div>
    </nav>
  );
}

export default Header;
