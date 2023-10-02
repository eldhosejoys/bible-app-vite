import { Link, useSearchParams, useNavigate , useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { transliterate,getCacheData,getLanguage } from '../config/Utils';
import { siteConfig } from "../config/siteConfig";
import Settings from "../features/Settings";
import IndexButton from "../features/IndexButton";
import {getTranslation} from '../config/SiteTranslations';


function Header(props) {
    // const [chapters, setChapters] = useState([]);
    const [input, setInput] = useState(props?.value ?? '');
    const [searchParams, setSearchParams] = useSearchParams();
    const regInput = useRef();
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    const [placeholder, setPlaceholder] = useState(getTranslation().searchPlaceHolder);

    function handleInput(e) {
        const value = e;
        // console.log(value);
        setInput(value);
        setSuggestions([]);
        if(localStorage.getItem('bible-language') == 'English'){return}
        transliterate(value).then((b) => {
          // console.log(b);
          setSuggestions(b);
          setActiveSuggestion(0); // reset active suggestion
          setShowSuggestions(!!b.length); // show suggestion list if suggestions are available
          if(e.endsWith(" ")){ setShowSuggestions(false);} // hide suggestion list where words last list space
        });
      }
      
      function handleSuggestionClick(suggestion) {
        setInput(suggestion);
        setActiveSuggestion(-1); // reset active suggestion
        setShowSuggestions(false); // hide suggestion list
      }

      function handleKeyDown(e) {
        if (e.keyCode === 38) { // up arrow key
          e.preventDefault();
          setActiveSuggestion(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.keyCode === 40) { // down arrow key
          e.preventDefault();
          setActiveSuggestion(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.keyCode === 13) { // enter key
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
              setInput(suggestions[activeSuggestion]);
              setShowSuggestions(false);
            } else {
              // handle search
              navigate(`/search?q=${regInput.current.value}`);
            }
            
          } else if (e.keyCode === 32 || e.endsWith(" ")) { // space key
              handleSuggestionClick(suggestions[activeSuggestion]);
          }
      }

      function numExtraKeys() {
        const number = parseInt(location.pathname.split("/")[2]);
        switch (number) {
          case 1: return getTranslation().numExtra[0];
          case 2: return getTranslation().numExtra[1];
          case 3: return getTranslation().numExtra[2];
          default: return getTranslation().numExtra[3];
        }
       
      }

            
    useEffect(()=>{
       if(searchParams.get("q") == null){
        setInput(regInput.current.value);
       }else{
        setInput(searchParams.get("q"));
       }

    },[searchParams]);

    useEffect(()=>{
      placeHolder();
   },[location]);
    
   function placeHolder(){
    const pattern = /\d+(\/\d+)*/  ; // regular expression to match the pattern "/number/number"
    if(pattern.test(location.pathname)){
      const loadindex = async () => {
        const resp = await getCacheData('cache', siteConfig().titleurl);
        if (resp) {
          if(getLanguage() == "English"){ var h_lang = resp[location.pathname.split("/")[1]-1].be}else{ var h_lang =resp[location.pathname.split("/")[1]-1].bm;}
          const placer = h_lang+" : "+location.pathname.split("/")[2]+numExtraKeys()+getTranslation().chapter;
          setPlaceholder(placer);
        }  };
        loadindex();
    }else{
      setPlaceholder(getTranslation().searchPlaceHolder); // Search for Verses in English
    }
   }

   function handleMouseEnter(){setPlaceholder(getTranslation().searchPlaceHolder);}

   function handleMouseLeave(){placeHolder();}

    return (
      <>
        <nav
          className="navbar navbar-expand-sm navbar-dark sticky-top"
          style={{ backgroundColor: "#344955" }}
        >
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
                onBlur={() => {setTimeout(() => setShowSuggestions(false), 100)}}
                aria-label="Search"
                name="q"
                required=""
                onFocus={handleMouseEnter}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />

              {showSuggestions && suggestions.length > 0 && localStorage.getItem('bible-language') != 'English' && (
                <ul className="suggestion-list">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={suggestion}
                      className={index === activeSuggestion ? "active" : ""}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                type="button"
                to={`/search?q=` + input}
                className="btn btn-light text-body me-2 rounded-end"
              >
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  className="bi bi-search blink_me"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z"
                  ></path>
                  <path
                    fill-rule="evenodd"
                    d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"
                  ></path>
                </svg>
              </Link>
              <IndexButton/> <Settings/>
            </span>
          </div>
        </nav>
      </>
    );
}

export default Header;