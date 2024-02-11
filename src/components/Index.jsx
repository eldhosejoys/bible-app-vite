import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import { getCacheData, addDataIntoCache,getLanguage } from '../config/Utils';
import {getTranslation} from '../config/SiteTranslations';
import Topdown from "../features/Topdown";

function Index() {
  const [cards, setCards] = useState([]);
  const itemsRef = useRef([]);

  function collapse(a) {
    if (itemsRef.current[a].style.display == 'none') {
      itemsRef.current[a].style.display = '';
    } else {
      itemsRef.current[a].style.display = 'none';
    }

  }

  function biblechapters(response) {
    let b = []; let c = [];

    document.title = getTranslation().siteTitle; 
    if(!getLanguage() || getLanguage() == "Malayalam"){ var h_lang = "bm"; var h_auth = "w";var h_d = "d";}else{ var h_lang = "be"; var h_auth = "we"; var h_d = "de";}

    response.forEach((response) => {
      b.push(
        <div className="col mb-1 justify-content-center">
          <div className="shadow-sm card flex-row flex-wrap hover-effect mb-3">
            <div className="card-body col-12 col-sm-9 text-center">
              <h5 className="card-title text-center text-primary fw-bolder"><Link className="text-decoration-none" to={`/${response["n"]}/1`} >{response[h_lang]}</Link></h5>
              <div className="small fw-bold"><img src="/assets/images/writer.png" alt={getTranslation().writer} height="28px" /> {response[h_auth]}</div>
              <div className="small fst-italic mt-2"><img src="/assets/images/date.png" alt={getTranslation().writtendate} height="28px" /> {response[h_d]}</div>

              <div style={{ "display": "none" }} key={response["n"]} ref={el => itemsRef.current[response["n"]] = el} className="row row-cols-auto mt-3 justify-content-center">

                {(() => {
                  let td = [];
                  for (let i = 1; i <= response["c"]; i++) {
                    td.push(
                      <div className="numberbox"><Link className="link-dark small text-decoration-none" to={`/${response["n"]}/${i}`} ><div className="col numberbox">{i}</div></Link> </div>
                    );
                  }
                  return td;
                })()}
              </div>
              <div style={{ "position": "relative", "marginBottom": "-35px" }} className="mt-3 arrowbutton"><span onClick={() => collapse(`${response["n"]}`)} className="btn border bg-body rounded-circle fw-bold arrowbutton" style={{color:"#0d6efd"}}>⇣⇡</span></div>

            </div>
          </div>
        </div>
      );

    });
    setCards(b);
  }

  useEffect(() => {
    window.speechSynthesis.cancel();
    setCards(
      <div className="spinner-grow text-center" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    );

    const loadindex = async () => {
      const a = await getCacheData('cache', siteConfig().titleurl);
      if (a) {
        biblechapters(a);
      }
      else {
        (async () => {
          await axios
            .get(siteConfig().titleurl)
            .then(function (response) {
              biblechapters(response.data);
              addDataIntoCache('cache', siteConfig().titleurl, response);
            })
            .catch(function (error) {
              console.log(error);
            })
        })();
      }
    };
    loadindex();

    const loadindex2 = async () => {
      const a = await getCacheData('cache', getBible());
      if (a) {
      }
      else {
        (async () => {
          await axios
            .get(getBible())
            .then(function (response) {
              addDataIntoCache('cache', getBible(), response);
            })
            .catch(function (error) {
              console.log(error);
            })
        })();
      }
    };
    loadindex2();

  }, []);

  return (<>
    <section className="py-2 mb-5">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">

            <section id="scroll-target">
              <div className="container-fluid my-2">
                <div className="row ">
                  <div className="container-fluid mt-3">
                    <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 row-cols-xxl-4 justify-content-center">
                      {cards}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Topdown/>
            
          </div>
        </div>
      </div>
    </section>
  </>);
}

export default Index;