import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ChangesMadeMalayalam() {
    useEffect(()=>{
        window.speechSynthesis.cancel();
        document.title = "അക്ഷര തിരുത്തലുകൾ മറ്റും വരുത്തിയ ഭാഗങ്ങൾ | Yehoshua.in"; 
    },[]);

    return (
        <>
                        <div className="container">
                            <div className="row justify-content-center ">
                                <div className="col-lg-12 col-xxl-12 ">
                                    <div className="py-4">
                                        <h1 className="h4 fw-bolder text-center mb-4">അക്ഷര തിരുത്തലുകൾ മറ്റും വരുത്തിയ ഭാഗങ്ങൾ</h1>
                                       
                                    </div>
                                </div>
                            </div>
                        </div>
        </>
    );
}

export default ChangesMadeMalayalam;