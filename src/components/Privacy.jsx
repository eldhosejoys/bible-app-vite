import { useEffect } from "react";
import { getTranslation } from '../config/SiteTranslations';

function Privacy() {

    useEffect(() => {
        window.speechSynthesis.cancel();
        document.title = getTranslation().sitePrivacyTitle + " | Yehoshua.in";
    }, []);

    return (
        <>
            <div className="container">
                <div className="row justify-content-center ">
                    <div className="col-lg-12 col-xxl-12 ">
                        <div className="py-4">
                            <h1 className="h4 fw-bolder text-center mb-4">{getTranslation().sitePrivacyTitle}</h1>

                            <div className="mb-4">
                                <p className="lead">ഈ വെബ്സൈറ്റ് ഉപയോഗിക്കുന്നവരുടെ സ്വകാര്യതയ്ക്ക് ഞങ്ങൾ വലിയ പ്രാധാന്യം നൽകുന്നു.</p>

                                <h5 className="mt-4">വിവരശേഖരണം</h5>
                                <p>ഈ വെബ്സൈറ്റ് നിങ്ങളുടെ പേര്, ഇമെയിൽ വിലാസം, ഫോൺ നമ്പർ തുടങ്ങിയ വ്യക്തിപരമായ വിവരങ്ങളൊന്നും ശേഖരിക്കുന്നില്ല.</p>

                                <h5 className="mt-4">കുക്കികൾ & ലോക്കൽ സ്റ്റോറേജ്</h5>
                                <p>ഈ വെബ്സൈറ്റ് സുഗമമായി പ്രവർത്തിക്കുന്നതിന് ആവശ്യമായ സാങ്കേതിക വിവരങ്ങൾ മാത്രമാണ് നിങ്ങളുടെ ബ്രൗസറിൽ സൂക്ഷിക്കുന്നത് (ഉദാഹരണത്തിന്: ഫോണ്ട് വലിപ്പം, നൈറ്റ് മോഡ് ക്രമീകരണങ്ങൾ). ഇത് നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെ സൂക്ഷിക്കപ്പെടുന്നവയാണ് അല്ലാതെ സെർവറിൽ അല്ല.</p>

                                <h5 className="mt-4">ബാഹ്യ ലിങ്കുകൾ</h5>
                                <p>ഈ വെബ്സൈറ്റിൽ മറ്റ് വെബ്സൈറ്റുകളിലേക്കുള്ള ലിങ്കുകൾ ഉണ്ടായിരിക്കാം. ആ വെബ്സൈറ്റുകളുടെ സ്വകാര്യതാ നയങ്ങൾക്ക് ഞങ്ങൾ ഉത്തരവാദികളല്ല.</p>

                                <hr className="my-5" />

                                <h4 className="h5 fw-bold text-center">Privacy Policy</h4>
                                <p>We highly value the privacy of our users.</p>

                                <h6 className="fw-bold mt-3">Data Collection</h6>
                                <p>This website does not collect any personal information such as your name, email address, or phone number.</p>

                                <h6 className="fw-bold mt-3">Cookies & Local Storage</h6>
                                <p>We use local storage only to save your preferences (like font size, theme settings) to improve your experience. This data is stored on your device and is not sent to our servers.</p>

                                <h6 className="fw-bold mt-3">External Links</h6>
                                <p>This website may contain links to other websites. We are not responsible for the privacy policies of those websites.</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Privacy;
