import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import { getCacheData, addDataIntoCache, getLanguage } from '../config/Utils';
import { getTranslation } from '../config/SiteTranslations';
import Topdown from "../features/Topdown";

function Index() {
  const [bibleData, setBibleData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsRef = useRef([]);

  // The collapse function is wrapped in useCallback to prevent it from being recreated on each render.
  const collapse = useCallback((a) => {
    const element = itemsRef.current[a];
    if (element) {
      element.style.display = element.style.display === 'none' ? '' : 'none';
    }
  }, []);

  // useEffect hook to fetch all necessary data in parallel.
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsLoading(true);

    // This function fetches data from a URL, checks the cache first, and then caches the new data.
    const fetchData = async (cacheKey, url) => {
      const cachedData = await getCacheData('cache', cacheKey);
      if (cachedData) {
        return cachedData;
      }
      try {
        const response = await axios.get(url);
        addDataIntoCache('cache', cacheKey, response);
        return response.data;
      } catch (error) {
        console.error("Error fetching data for:", url, error);
        return null; // Return null on error
      }
    };

    const loadAllData = async () => {
      const [titles, bibleContent] = await Promise.all([
        fetchData(siteConfig().titleurl, siteConfig().titleurl),
        fetchData(getBible(), getBible())
      ]);

      if (titles) {
        document.title = getTranslation().siteTitle;
        setBibleData(titles);
      }
      
      setIsLoading(false);
    };

    loadAllData();

  }, []); 

  // useMemo will only re-calculate the `cards` when `bibleData` changes.
  // This avoids expensive re-rendering on every component update.
  const cards = useMemo(() => {
    if (isLoading) {
      return (
        <div className="spinner-grow text-center" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      );
    }

    const lang = getLanguage();
    const h_lang = !lang || lang === "Malayalam" ? "bm" : "be";
    const h_auth = !lang || lang === "Malayalam" ? "w" : "we";
    const h_d = !lang || lang === "Malayalam" ? "d" : "de";

    return bibleData.map((book) => (
      <div className="col mb-1 justify-content-center" key={book.n}>
        <div className="shadow-sm card flex-row flex-wrap hover-effect mb-3">
          <div className="card-body col-12 col-sm-9 text-center">
            <h5 className="card-title text-center text-primary fw-bolder">
              <Link className="text-decoration-none" to={`/${book.n}/1`}>
                {book[h_lang]}
              </Link>
            </h5>
            <div className="small fw-bold">
              <img src="/assets/images/writer.png" alt={getTranslation().writer} height="28px" /> {book[h_auth]}
            </div>
            <div className="small fst-italic mt-2">
              <img src="/assets/images/date.png" alt={getTranslation().writtendate} height="28px" /> {book[h_d]}
            </div>

            <div
              style={{ display: "none" }}
              ref={el => itemsRef.current[book.n] = el}
              className="row row-cols-auto mt-3 justify-content-center"
            >
              {Array.from({ length: book.c }, (_, i) => i + 1).map((chapter) => (
                <div className="numberbox" key={chapter}>
                  <Link className="link-dark small text-decoration-none" to={`/${book.n}/${chapter}`}>
                    <div className="col numberbox">{chapter}</div>
                  </Link>
                </div>
              ))}
            </div>
            
            <div style={{ position: "relative", marginBottom: "-35px" }} className="mt-3 arrowbutton">
              <span onClick={() => collapse(book.n)} className="btn border bg-body rounded-circle fw-bold arrowbutton" style={{ color: "#0d6efd" }}>
                ⇣⇡
              </span>
            </div>

          </div>
        </div>
      </div>
    ));
  }, [isLoading, bibleData, collapse]); // Dependencies for the useMemo hook

  return (
    <>
      <section className="py-2 mb-5">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12">
              <section id="scroll-target">
                <div className="container-fluid my-2">
                  <div className="row">
                    <div className="container-fluid mt-3">
                      <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 row-cols-xxl-4 justify-content-center">
                        {cards}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <Topdown />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Index;