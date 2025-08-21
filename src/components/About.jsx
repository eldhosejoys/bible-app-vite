import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { getTranslation } from '../config/SiteTranslations';

function About() {
  const [cards, setCards] = useState([]);
  // set \"REACT_APP_BUILD_DATE=$(TZ=Asia/Kolkata date +'%Y-%m-%d %H:%M:%S')\" && 
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE; //  


  useEffect(() => {
    window.speechSynthesis.cancel();
    document.title = getTranslation().siteAboutTitle + " | Yehoshua.in";
    generateNumberBox();
  }, []);

  function generateNumberBox() {
    const b = [];
    const headingKeys = Object.keys(siteConfig().headings);
    console.log("headingKeys:" + headingKeys);
    for (const number of headingKeys) {
      b.push(
        <div className="numberbox" key={number}>
          <Link className="link-dark small text-decoration-none" to={`/${number}/1`}>
            <div className="col numberbox">{number}</div>
          </Link>
        </div>
      );
    }
    setCards(b);
  }

  return (
    <>
      <div className="container">
        <div className="row justify-content-center ">
          <div className="col-lg-12 col-xxl-12 ">
            <div className="py-4">
              <h1 className="h4 fw-bolder text-center mb-4">{getTranslation().siteAboutTitle}</h1>
              <p className="lead">ലോകമെമ്പാടുമുള്ള മലയാളം വായനക്കാരുമായി ജീവന്റെ വചനം പങ്കുവയ്ക്കുന്നതിനാണ് ഈ വെബ്സൈറ്റ് സൃഷ്ടിച്ചിരിക്കുന്നത്.</p>
              <p>ഈ വെബ്‌സൈറ്റിൽ നൽകിയിരിക്കുന്ന മലയാളം പരിഭാഷ എടുത്തിരിക്കുന്നത് <a target="_blank" href="http://verseview.info/vv/bible-database/">ഇവിടെ നിന്നാണ്</a>. ഈ വെബ്സൈറ്റിൻറെ കോഡ് കിട്ടുന്നതിനായി <a target="_blank" href="https://github.com/eldhosejoys/bible-app-vite">ഗിറ്റ്ഹബ് സന്ദർശിക്കുക</a>.</p>
              <p>വാക്യങ്ങൾക്ക് റെഫെറെൻസുകൾ കൊടുത്തിട്ടുണ്ട്. അതിനുള്ള സ്രോതസ്സ് <a target="_blank" href="https://www.openbible.info/labs/cross-references/">ഓപ്പൺബൈബിളിൽ</a> നിന്നാണ് എടുത്തിട്ടുള്ളത്.</p>
              <p>പുസ്തകങ്ങൾക്ക് ശീർഷകങ്ങളും ആമുഖവും മലയാളത്തിൽ കൊടുത്തിട്ടുണ്ട്. അത് സഹായകരമായിരിക്കും എന്ന് പ്രതീഷിക്കുന്നു. ശീർഷകങ്ങളും ആമുഖവും കൊടുത്ത പുസ്തകങ്ങൾ താഴെ കൊടുത്തിരിക്കുന്നു. </p>
              <p className="container row">{cards}</p>
              <p>കൂടുതൽ വായിക്കുക: <a target="_blank" href={`https://blog.${window.location.hostname}`}>ബ്ലോഗ്</a> , <a target="_blank" href={`https://parrudeesa.${window.location.hostname}`}>വചന വെളിപ്പാടുകൾ</a></p>
              {buildDate &&
                <p><small>Last Updated: {buildDate}</small></p>
              }

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default About;