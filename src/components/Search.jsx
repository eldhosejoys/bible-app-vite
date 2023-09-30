import { Link, useParams, useLocation, useSearchParams,useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, React } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import {getTranslation} from '../config/SiteTranslations';
import { speaksearch, getCacheData, addDataIntoCache, copyToClipBoard,getLanguage } from '../config/Utils';
import Topdown from "../features/Topdown";

function Search() {
  let params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const itemsRef = useRef([]); const itemsRef2 = useRef([]); const itemsRef3 = useRef([]);
  
  let b = [];
  let nav = [];

  function biblecontent(response, q, titlecontents) {
    var r = response.filter(function (obj) {
      return (obj.t.indexOf(q) >= 0);
    });

    const rangevalue = 500;

    b = []; // clearing array first
    nav = [];
    var pval = Number.isInteger(parseInt(searchParams.get("p"))) ? parseInt(searchParams.get("p")) : 1;
    if(pval > Math.ceil(r.length/rangevalue) && pval > 1){
      navigate(`/search?q=${q}&p=${Math.ceil(r.length/rangevalue)}`);
    }else if(pval < 1){
      navigate(`/search?q=${q}`);
    }
    
    if(pval> 1){
    document.title = `Search: ${q} | page ${pval} | ${getTranslation().siteTitle}`;
    }else{
    document.title = `Search: ${q} | ${getTranslation().siteTitle}`;
    }
    {
      (() => {
        var td = [];
        if (r.length <= 0) {
          td.push(
            <div className="text-center fw-lighter mb-3 text-secondary">No results found</div>
          );
        }
        else if (r.length < rangevalue) {
          td.push(
            <div className="text-center fw-lighter mb-3 text-secondary">{r.length} results found</div>
          );
        }
        else {
          var range;
          if(pval ==1){
             range = `first ${rangevalue}`;
          }else{
            range = (((pval-1)*rangevalue)+1)+" to "+(((pval-1)*rangevalue)+rangevalue > r.length?r.length: ((pval-1)*rangevalue)+rangevalue);
          }
          td.push(
            <div className="text-center fw-lighter mb-3 text-secondary">Showing the {range} results of {r.length}</div>
          );
        }

        b.push(td)
        return td;
      })()
    }

    nav.push(
      (() => {
        var td = [];
        var i = 1, len = Math.ceil(r.length/rangevalue);
    
        while (i <= len) {
          if (i == pval) {
            td.push(
              <div className="numberbox">
                            <a className="link-dark small text-decoration-none" >
                              <div className="col numberbox" style={{ "background-color": "#8D9EFF" }}>
                              <select style={{"background-color": "transparent",border: "none", outline:"0px" }} value={pval} onChange={(e)=>{navigate(`/search?q=${q}&p=${e.target.value}`)}}>
        
        {Array.from({ length: len }, (_, index) => (
          <option key={index + 1} value={index + 1}><Link to={`/search?q=${q}&p=${index+1}`}>{index+1}</Link></option>
        ))}
      </select>
                              </div>
                            </a>
                          </div>);
          }else if(i <= pval+4 && i >= pval-4){
            td.push(
              <div className="numberbox">
                            <Link className="link-dark small text-decoration-none" to={`/search?q=${q}&p=${i}`}>
                              <div className="col numberbox">{i}</div>
                            </Link>
                          </div>);
          }else if(i ==pval+5){
            td.push(
              <div className="numberbox">
                            <Link className="link-dark small text-decoration-none" to={`/search?q=${q}&p=${i}`}>
                              <div className="col numberbox">{`>>`}</div>
                            </Link>
                          </div>);
          }else if(i == pval-5){
            td.push(
              <div className="numberbox">
                            <Link className="link-dark small text-decoration-none" to={`/search?q=${q}&p=${i}`}>
                              <div className="col numberbox">{`<<`}</div>
                            </Link>
                          </div>);
          }
          
          i++
      }

return td;
      })()
      
    );
    setNavigation(nav);

    for (var i = (pval-1)*rangevalue; i < ((pval-1)*rangevalue)+rangevalue; i++) {
      if (r[i]) {
        var response = r[i];
        var index = i;
        // results.push(r[i]);

        var m = titlecontents.filter(function (obj) {
          return (obj.n == response["b"]);
        });

        var splited = response["t"].replace(RegExp(q, "g"), "<span className='text-dark' style='background-color: #fff952;'>" + q + "</span>");
        const currentFontSize = localStorage.getItem('fontSize'); //font size control
        const currentCompact = localStorage.getItem('compact');
        if(getLanguage() == "English"){ var h_lang = m[0].be;}else{ var h_lang =m[0].bm;}
        (function (response, index, splited, h_lang) {
        b.push(
          <div className={`col mb-2 pushdata`} id={`v-${response["v"]}`}>
            <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
            <span className={`words-text-player position-absolute mt-3 translate-middle badge rounded-pill ${currentCompact ? 'd-none' : ''}`} style={{backgroundColor: 'rgb(238, 238, 238)'}}><a className="link-primary fw-bold small text-decoration-none">{index+1}</a></span> 
              <div className="card-body col-12" ref={el => itemsRef3.current[index] = el}>
                <div className="row row-col-2 g-2">
                  {/* <div className="col-auto"><span className="fw-bold">{response["v"]}.</span></div> */}
                  <div className={`col text-left words-text fs-${currentFontSize}`} ><div dangerouslySetInnerHTML={{ __html: splited }} /><Link className="link-dark small text-decoration-none" to={`/${response["b"]}/${response["c"]}/${response["v"]}`}><div className="fw-bold text-primary">({h_lang} {response["c"]}:{response["v"]})</div></Link> </div>
                  <div className={`words-text-player ${currentCompact ? 'd-none' : ''} col-auto text-right ml-auto my-auto`}>                 
                    {(() => {
                      // console.log(response["t"]+" ("+h_lang+" "+response["c"]+":"+response["v"]+")")
                      var td = [];
                      if (('SpeechRecognition' in window || 'webkitSpeechRecognition' in window ) && navigator.onLine) {
                        td.push(
                          <div style={{ "position": "relative", "margin-right": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current[index] = el} onClick={e => speaksearch(response["t"], index,itemsRef,itemsRef2,itemsRef3)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img ref={el => itemsRef.current[index] = el} src="/assets/images/play.svg" width="16px" height="16px" /></a></div>
                        );
                      }
                      td.push(
                        <div style={{ "position": "relative", "margin-right": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current["c-"+index] = el} onClick={e => copyToClipBoard(response["t"]+" ("+h_lang+" "+response["c"]+":"+response["v"]+")", index,itemsRef,itemsRef2)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img ref={el => itemsRef.current["c-"+index] = el} src="/assets/images/clipboard.svg" width="16px" height="16px"/></a></div>
                      );
                      return td;
                    })()}  
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })(response, index, splited, h_lang);
      }
    }
    setCards(b);

  }

  useEffect(() => {
    window.speechSynthesis.cancel();
    setNavigation([]);
    setCards(
      <div className="spinner-grow text-center" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    );

    window.scrollTo({top: 0,behavior: 'smooth',});

    let titlecontents;
    const titlenavi = async () => {
      const a = await getCacheData('cache', siteConfig().titleurl);
      if (a) {
        titlecontents = a;
      } else {
        (async () => {
          await axios
            .get(siteConfig().titleurl)
            .then(function (response) {
              titlecontents = response.data;
              addDataIntoCache('cache', siteConfig().titleurl, response);
            })
            .catch(function (error) {
              console.log(error);
            })
            .then(function () { });
        })();
      }
    };
    titlenavi();

    const biblecontents = async () => {

      const a = await getCacheData('cache', getBible());
      if (a) {
        biblecontent(a, searchParams.get("q"), titlecontents);
      } else {
        (async () => {
          await axios
            .get(getBible())
            .then(function (response) {
              biblecontent(response.data, searchParams.get("q"), titlecontents);
              addDataIntoCache('cache', getBible(), response);
            })
            .catch(function (error) {
              console.log(error);
            })
            .then(function () { });
        })();
      }
    };
    biblecontents();

  }, [location]);
  return (
    <section className="py-2 mb-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <section id="scroll-target">
              <div className="container my-2">
                <div className="row row-cols-1 justify-content-center">
                 {cards}
                <div></div>
                  {navigation}
                </div>
                <Topdown/>
              </div>
             
            </section>
            
          </div>
        </div>
      </div>
    </section>
    
  );
}

export default Search;