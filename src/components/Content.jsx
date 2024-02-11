import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, React } from "react";
import axios from "axios";
import { siteConfig, getBible } from "../config/siteConfig";
import {getTranslation} from '../config/SiteTranslations';
import { speakcontent, getCacheData, addDataIntoCache, copyToClipBoard, getLanguage } from '../config/Utils';

function Content() {
  let params = useParams();
  const location = useLocation();
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const itemsRef = useRef([]); const itemsRef2 = useRef([]); const itemsRef3 = useRef([]);
  const [chapter, setChapter] = useState();
  const [chaptername, setChaptername] = useState();

  let b = [];
 
  if (isNaN(parseInt(params.book))) {  navigate("/1/1");}  
  else if (parseInt(params.book) > 66) { navigate("/66/1"); }
  else if (parseInt(params.book) < 1) { navigate("/1/1"); }
  else if (isNaN(parseInt(params.chapter)) || parseInt(params.chapter) <= 0 || !params.chapter) 
  {navigate("/" + params.book + "/1");} 


  let loadedCard = (e) => {
    // setVerse(verse+1);
    if (params.verse && params.verse == parseInt(e) + 1) {
      itemsRef3.current[parseInt(params.verse) - 1].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      itemsRef3.current[parseInt(params.verse) - 1].style.backgroundColor = '#faebd7';
      itemsRef3.current[parseInt(params.verse) - 1].style.color = '#000';
      itemsRef2.current[parseInt(params.verse) - 1].style.backgroundColor = '#ffb380';

      // setTimeout(
      //   () => {
      //     itemsRef2.current[parseInt(params.verse) - 1].style.backgroundColor = '';
      //     itemsRef3.current[parseInt(params.verse) - 1].style.backgroundColor = '';
      //   },
      //   1500
      // );
    }
  }

  function titlenav(response) {

    var r = response.filter(function (obj) {
      return (obj.n == params.book);
    });

    if(!getLanguage() || getLanguage() == "Malayalam"){ var h_lang =r[0].bm;}else{ var h_lang = r[0].be}

    if(params.verse){
      document.title = h_lang+" ("+params.chapter+":"+params.verse+") | "+getTranslation().siteTitle; 
    }else{
      document.title = h_lang+" ("+params.chapter+") | "+getTranslation().siteTitle; 
    }
    

    setNavigation(
      <div className="row row-2 justify-content-center mt-4">
        {(() => {
          var tp = [];
          if (params.chapter > 1 && params.chapter <= r[0].c) {
            tp.push(
              <div className="col-auto mr-auto"><Link title={getTranslation().preChapter} to={`/${params.book}/${parseInt(params.chapter) - 1}`} ><div className="arrowbutton card rounded-circle"><a className="btn rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-left.svg" alt="prev"/></a></div></Link></div>
            );
          }
          if (params.book > 1 && params.chapter == 1) {
            tp.push(
              <div className="col-auto mr-auto"><Link title={getTranslation().preBook} to={`/${parseInt(params.book) - 1}/1`} ><div className="arrowbutton card rounded-circle"><a className="btn rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-left.svg" alt="prev" /></a></div></Link></div>
            );
          }
          if (params.chapter < r[0].c && params.chapter >= 1) {
            tp.push(
              <div className="col-auto"><Link title={getTranslation().nextChapter} to={`/${params.book}/${parseInt(params.chapter) + 1}`}><div className="arrowbutton card rounded-circle"><a className="btn rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-right.svg" alt="next"/></a></div> </Link> </div>
            );
          }
          if (params.book < 66 && params.chapter >= r[0].c) {
            tp.push(
              <div className="col-auto"><Link title={getTranslation().nextBook} to={`/${parseInt(params.book)+1}/1`}><div className="arrowbutton card rounded-circle"><a className="btn rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-right.svg" alt="next" /></a></div> </Link> </div>
            );
          }
          return tp;
        })()}
      </div>
    );

    setChaptername(h_lang);

    setTitle(
      
      <div className="text-center mb-2">
        <div className="d-flex justify-content-center align-items-center">
        {(() => {
        var tp = [];
        if (params.book > 1) {
          tp.push(
            <div className=""><Link title={getTranslation().preBook} to={`/${parseInt(params.book) - 1}/1`} ><div className="arrowbutton card rounded-circle" ><a className="btn btn-sm rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-left.svg" alt="prev" /></a></div></Link></div>
          );
        }
        return tp;
        })()}
        <h3 className="mx-3"> <span className="text-primary fw-bold"><Link className="text-decoration-none" to={`/${r[0].n}/1`} >{h_lang}</Link></span> - {getTranslation().chapter} {params.chapter} </h3>
        {(() => {
        var tp = [];
        if (params.book < 66) {
          tp.push(
            <div className=""><Link title={getTranslation().nextBook} to={`/${parseInt(params.book)+1}/1`}><div className="arrowbutton card rounded-circle"><a className="btn btn-sm rounded-circle arrowbutton"><img className="" src="/assets/images/arrow-right.svg" alt="next" /></a></div> </Link> </div>
          );
        }
        return tp;
        })()}
        </div>
        <div className="row row-cols-auto mt-3 justify-content-center">
          {(() => {
            let td = [];
            for (let i = 1; i <= r[0].c; i++) {
              if (i == params.chapter) {
                td.push(
                  <div key={i} className="numberbox" ><Link className="link-dark small text-decoration-none" to={`/${params.book}/${i}`} ><div className="col numberbox" style={{ "backgroundColor": "#8D9EFF" }}>{i}</div></Link> </div>
                );
              }
              else {
                td.push(
                  <div key={i} className="numberbox"><Link className="link-dark small text-decoration-none" to={`/${params.book}/${i}`} ><div className="col numberbox">{i}</div></Link> </div>
                );
              }
            }
            return td;
          })()}
        </div>
      </div>
    );
  }

  function biblecontent(response) {
    var r = response.filter(function (obj) {
      return (obj.b == params.book && obj.c == params.chapter); 
    });
   //adding headings 
   headings().then((heading) => {
    if(r.length <= 0){}
    b = []; // clearing array first
    let chap = JSON.stringify(r);
    const currentFontSize = localStorage.getItem('fontSize');
    const currentCompact = Boolean(localStorage.getItem('compact'));
    const theme = localStorage.getItem('theme');
    var colorText;
    if(theme == 'dark'){colorText = 'text-warning';}else{colorText = 'text-danger';}
    // console.log("compact: "+currentCompact+" fontsize: "+currentFontSize);
    r.forEach((response, index) => {
      if((!getLanguage() || getLanguage() == 'Malayalam') && heading && heading.find(heading => heading.c == params.chapter && heading.v == response["v"])){
        // console.log(heading.find(heading => heading.c == params.chapter && heading.v == response["v"]).h);
        b.push(
          <div className="col mb-2 pushdata" id={`h-${response["v"]}`}>
            <div className={`words-text-card ${currentCompact ? '' : 'shadow-md card'}`}>
              <div className="card-body rounded col-12">
                <div className="d-flex flex-row row-col-3 g-2 text-break">
                  <div className={`col ${colorText} fw-bolder heading-color words-text fs-${currentFontSize}`}> {heading.find(heading => heading.c == params.chapter && heading.v == response["v"]).h}</div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      b.push(
        <div className="col mb-2 pushdata" id={`v-${response["v"]}`}>
          <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
            <div className="card-body rounded col-12" ref={el => itemsRef3.current[index] = el}>
              <div className="d-flex flex-row row-col-3 g-2 text-break">
                <div className={`col text-left words-text fs-${currentFontSize}`}><span className="fw-bold"><Link className={`text-decoration-none words-text fs-${currentFontSize}`} to={`/${params.book}/${params.chapter}/${response["v"]}`} >{response["v"]}.</Link></span> {response["t"]}</div>
                <div className={`words-text-player ${currentCompact ? 'd-none' : ''} col-auto text-right ml-auto my-auto`}>
                  {(() => {
                    var td = [];
                    if (('SpeechRecognition' in window || 'webkitSpeechRecognition' in window ) && navigator.onLine) {
                      td.push(
                        <div style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current[index] = el} onClick={e => speakcontent(chap, index,itemsRef,itemsRef2,itemsRef3)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img ref={el => itemsRef.current[index] = el} src="/assets/images/play.svg" width="16px" height="16px" /></a></div>
                      );
                    }
                    td.push(
                      <div style={{ "position": "relative", "marginRight": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current["c-" + index] = el} onClick={e => copyToClipBoard(response["t"] + " (" + chaptername + " " + params.chapter + ":"+(index+1)+")", index, itemsRef,itemsRef2)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img onLoad={(e) => { if (parseInt(params.verse) == index + 1) { loadedCard(index); } }} ref={el => itemsRef.current["c-" + index] = el} src="/assets/images/clipboard.svg" width="16px" height="16px" /></a></div>
                    );
                    return td;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
    setCards(b);
  });
  }


  const headings= async () => {
    if(siteConfig().headings.hasOwnProperty(params.book)){
      const a = await getCacheData('cache', siteConfig().headingurl); //headings[params.book]
      if (a) {
        return a[params.book];
      } else {
        (async () => {
          await axios
            .get(siteConfig().headingurl)
            .then(function (response) {
              addDataIntoCache('cache', siteConfig().headingurl, response);
              return response[params.book];
            })
            .catch(function (error) {
              console.log(error);
            })
            .then(function () { });
        })();
      }
    }
  };

  // useEffect(() => {
    
  // },[location]);

  useEffect(() => {
    window.speechSynthesis.cancel();
    setCards(
      <div className="spinner-grow text-center" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    );
    
    const titlenavi = async () => {
      const a = await getCacheData('cache', siteConfig().titleurl);
      if (a) {
        titlenav(a);
      } else {
        (async () => {
          await axios
            .get(siteConfig().titleurl)
            .then(function (response) {
              titlenav(response.data);
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
        biblecontent(a);
      } else {
        (async () => {
          await axios
            .get(getBible())
            .then(function (response) {
              biblecontent(response.data);
              addDataIntoCache('cache', getBible(), response);

            })
            .catch(function (error) {
              console.log(error);
            })
            .then(function () {
            });
        })();
      }
    };
    biblecontents();

  }, [chaptername,location]);

// navigate through swipe

  // const gettitle = async (side) => {
  //   const response = await getCacheData('cache', siteConfig().titleurl);
  //   if (response) {
  //     var r = response.filter(function (obj) {
  //       return (obj.n == params.book);
  //     });

  //     if (params.chapter < r[0].c && params.chapter >= 1 && side == 'left') {
  //       navigate(`/${params.book}/${parseInt(params.chapter)-1}`);
  //       params.chapter = parseInt(params.chapter)-1;
  //     }else if(params.chapter < r[0].c && params.chapter >= 1 && side == 'right'){
  //       navigate( `/${params.book}/${parseInt(params.chapter)+1}`);
  //       params.chapter = parseInt(params.chapter)+1;
  //     }
  
  //   }};


  // useEffect(() => {
  //   const container = containerRef.current;
  //   const hammer = new Hammer(container);
  //   hammer.on('swipeleft', () => {
  //     // handle swipe left
  //     console.log('swipe left');
  //     gettitle('left');
  //   });


  //   hammer.on('swiperight', () => {
  //     // handle swipe right
  //     console.log('swipe right');
  //     gettitle('right');
  //     // hammer.off('swiperight');
  //   });

  // }, []);

  return (
    <section className="py-2 mb-5">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <section id="scroll-target">
              <div className="container my-2">
                <div className="row row-cols-1 justify-content-center" ref={containerRef}>
                  {title}
                  {cards}
                  {navigation}
                  {(() => {

                  })()}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Content;