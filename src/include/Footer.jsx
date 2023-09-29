import { Link } from "react-router-dom";
import { useState, useEffect } from 'react';
import {getTranslation} from '../config/SiteTranslations';

function Footer() {
  
    return (<>
        <footer className="py-4 mt-auto" style={{backgroundColor:"#344955"}}>
  <div className="container px-5">
    <div className="row  justify-content-center flex-column flex-sm-row">
      <div className="col-auto">
        <div className="small m-0 text-white">©{(new Date().getFullYear())} {getTranslation().siteFooter}</div>
      </div>
      <div className="col-auto">
        {/* <Link className="link-light small" to="/">Home</Link> */}
      </div>
    </div>
  </div>
</footer>
</> );
}

export default Footer;