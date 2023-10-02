import React from 'react'
import { Link } from "react-router-dom";
import {  useRef } from "react";
import { speaksearch,copyToClipBoard } from '../../config/Utils';

function SearchCard(props) {
    const itemsRef = useRef([]); const itemsRef2 = useRef([]); const itemsRef3 = useRef([]);

    const currentFontSize = localStorage.getItem('fontSize'); //font size control
    const currentCompact = localStorage.getItem('compact');
    const response = props.value.response;
    const index = props.value.index;
    const splited = props.value.splited;
    const h_lang = props.value.h_lang;

    console.log(props.value)

    return (
        <>

            <div className={`col mb-2 pushdata`} id={`v-${response["v"]}`}>
                <div className={`words-text-card ${currentCompact ? '' : 'shadow-sm card'}`}>
                    <span className={`words-text-player position-absolute mt-3 translate-middle badge rounded-pill ${currentCompact ? 'd-none' : ''}`} style={{ backgroundColor: 'rgb(238, 238, 238)' }}><a className="link-primary fw-bold small text-decoration-none">{index + 1}</a></span>
                    <div className="card-body col-12" ref={el => itemsRef3.current[index] = el}>
                        <div className="row row-col-2 g-2">
                            <div className={`col text-left words-text fs-${currentFontSize}`} ><div dangerouslySetInnerHTML={{ __html: splited }} /><Link className="link-dark small text-decoration-none" to={`/${response["b"]}/${response["c"]}/${response["v"]}`}><div className="fw-bold text-primary">({h_lang} {response["c"]}:{response["v"]})</div></Link> </div>
                            <div className={`words-text-player ${currentCompact ? 'd-none' : ''} col-auto text-right ml-auto my-auto`}>
                                {(() => {
                                    var td = [];
                                    if (('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && navigator.onLine) {
                                        td.push(
                                            <div style={{ "position": "relative", "margin-right": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current[index] = el} onClick={e => speaksearch(response["t"], index, itemsRef, itemsRef2, itemsRef3)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img ref={el => itemsRef.current[index] = el} src="/assets/images/play.svg" width="16px" height="16px" /></a></div>
                                        );
                                    }
                                    td.push(
                                        <div style={{ "position": "relative", "margin-right": "-35px" }} className="arrowbutton card rounded-circle"><a ref={el => itemsRef2.current["c-" + index] = el} onClick={e => copyToClipBoard(response["t"] + " (" + h_lang + " " + response["c"] + ":" + response["v"] + ")", index, itemsRef, itemsRef2)} className="btn btn-small rounded-circle fw-bold arrowbutton"><img ref={el => itemsRef.current["c-" + index] = el} src="/assets/images/clipboard.svg" width="16px" height="16px" /></a></div>
                                    );
                                    return td;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SearchCard
