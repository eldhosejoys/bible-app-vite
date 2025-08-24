import { Link } from "react-router-dom";
import { useState, useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import axios from "axios";
import { siteConfig } from "../config/siteConfig";
import { getCacheData, addDataIntoCache, getLanguage } from '../config/Utils';

function IndexButton() {
  const [chapters, setChapters] = useState([]);
  const [chapters2, setChapters2] = useState([]);
  const [chapnumbers, setChapNumbers] = useState([]);
  const [isMenuVisible, setMenuVisible] = useState(true);
  const [refresh, setRefresh] = useState(false);

  function numberbox(rp, response) {
    setMenuVisible(false);
    let td = [];
    for (let i = 1; i <= rp["c"]; i++) {
      td.push(
        <div key={i} className="numberbox"><Link className="link-dark small text-decoration-none" to={`/${rp["n"]}/${i}`} ><div className="col numberbox">{i}</div></Link> </div>
      );
    }
    let md = [];
    if (!getLanguage() || getLanguage() == "Malayalam") { var h_lang = "bm"; } else { var h_lang = "be" }
    md.push(<div className="text-center text-primary fw-bolder"><div className="bg-dark fixed-top py-2" onClick={() => { biblechapters(response); setMenuVisible(true); }}>← {rp[h_lang]}</div><div className="row row-cols-auto mt-5 mb-1 ps-4 pe-4 justify-content-center" style={{ minWidth: '250px' }}>{td}</div></div>)
    setChapNumbers(md);
  }

  function biblechapters(response) {
    let b = []; let b2 = [];
    let c = 1;
    if (!getLanguage() || getLanguage() == "Malayalam") { var h_lang = "bm"; } else { var h_lang = "be" }
    response.forEach((rp) => {
      response.forEach((rp, index) => {
        if (c <= 39) {
          b.push(
            <div key={index} className="ps-2 pe-1 fs-5" onClick={() => numberbox(rp, response)} style={{ backgroundColor: '' }} onMouseOver={(event) => { event.target.style.backgroundColor = '#0275d8' }} onMouseOut={(event) => { event.target.style.backgroundColor = '' }}>{rp[h_lang]}</div>
          );
        } else {
          b2.push(
            <div key={index} className="ps-2 pe-1 fs-5" onClick={() => numberbox(rp, response)} style={{ backgroundColor: '' }} onMouseOver={(event) => { event.target.style.backgroundColor = '#0275d8' }} onMouseOut={(event) => { event.target.style.backgroundColor = '' }}>{rp[h_lang]}</div>
          );
        }
        c++;
      });
    });
    setChapters(b);
    setChapters2(b2);
  }

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

  useEffect(() => {
    setChapters(
      <Dropdown.Item><div className="spinner-grow text-center justify-content-center" role="status">
        <span className="visually-hidden">Loading...</span>
      </div></Dropdown.Item>
    );
    loadindex();
  }, [refresh]);

  return (<>
    <Dropdown>
      <Dropdown.Toggle variant="dark" className="rounded-start form-control" size="md" >📜</Dropdown.Toggle>
      {(<Dropdown.Menu onShow={loadindex} className="" style={{ maxHeight: '72vh', minWidth: '50vw', maxWidth: '100vw', overflowY: 'hidden', overflowX: 'hidden', cursor: 'pointer' }}>
        <div className="row">
          {isMenuVisible && (
            <>
              <div className="col-auto col-md-5" style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: '70vh', minWidth: '25vw', maxWidth: '100vw', }}>
                {chapters}
                <div className="d-md-none">{chapters2}</div>
              </div>
              <div className="col-md-7 d-none d-md-block" style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: '70vh', minWidth: '25vw', maxWidth: '50%', }}>
                {chapters2}
              </div>
            </>
          )}
        </div>
        {!isMenuVisible && (
          <div className="col-sm-6 w-100" style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '70vh', minWidth: '30vw', }}>
            {chapnumbers}
          </div>
        )}



      </Dropdown.Menu>)}


    </Dropdown>
  </>);
}

export default IndexButton;