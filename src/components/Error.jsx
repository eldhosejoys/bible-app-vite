import { useEffect } from "react";
import { Link } from "react-router-dom";

function Error() {

    useEffect(()=>{
        window.speechSynthesis.cancel();
        console.log("not found");
    },[]);

    return (
        <>
            <header className="bg-dark py-5 vh-100">
                <div className="container px-5">
                    <header className="py-5 bg-dark ">
                        <div className="container px-5">
                            <div className="row justify-content-center ">
                                <div className="col-lg-6 col-xxl-6 ">
                                    <div className="text-center text-light my-2 ">
                                        <h1 className="fw-bolder text-center text-light ">Error 404 Found</h1>
                                        <p className="lead text-light ">The page you are looking for doesn't exist.</p>
                                        {/* <form className="form-inline mb-4 input-group" action="/search.php" method="GET"><input className="form-control" type="search" placeholder="Search this Site" aria-label="Search" name="q" required /><button type="submit" className="btn btn-light text-body"><svg width="1em" height="1em" viewBox="0 0 16 16" className="bi bi-search blink_me" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z" /><path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" /></svg></button></form> */}
                                        <Link className="btn btn-primary text-light btn-lg " to="javascript:history.back()">Back</Link> <Link className="btn btn-success text-light btn-lg " to="/ ">Navigate to Home</Link></div>
                                </div>
                            </div>
                        </div>
                    </header>
                </div>
            </header>
        </>
    );
}

export default Error;