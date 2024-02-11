import { getLanguage, setLanguage } from '../config/Utils';

export const getTranslation =  () => {
    const bibleLanguage = getLanguage();
    if(!bibleLanguage || bibleLanguage == 'Malayalam'){
        setLanguage('Malayalam');
        return {
            siteTitle: "ജീവന്റെ വചനം മലയാളം വേദപുസ്തകം | Yehoshua.in",
            siteFooter: "ജീവന്റെ വചനം മലയാളം",
            searchPlaceHolder:"മലയാളത്തിൽ വേദവാക്യങ്ങൾ തിരയുക...",
            chapter : "അദ്ധ്യായം",
            preBook : "മുൻ പുസ്തകം",
            nextBook : "അടുത്ത പുസ്തകം",
            preChapter :"മുൻ അദ്ധ്യായം",
            nextChapter : "അടുത്ത അദ്ധ്യായം",
            writer : "ഗ്രന്ഥകാരൻ",
            writtendate : "എഴുതിയ കാലഘട്ടം",
            read:"വായിക്കുക",
            siteAboutTitle :"വെബ്സൈറ്റിനെ സംബന്ധിച്ച്",
            numExtra :["-ാം ","-ാം ","-ാം ","-ാം "]
        };

    }else{

        return {
            siteTitle: "The Word of Life "+bibleLanguage+" Bible | Yehoshua.in",
            siteFooter: "The Word of Life "+bibleLanguage,
            searchPlaceHolder:"Search Verses in "+bibleLanguage+"...",
            chapter : "Chapter",
            preBook : "Previous Book",
            nextBook : "Next Book",
            preChapter :"Previous Chapter",
            nextChapter : "Next Chapter",
            writer : "Writer",
            writtendate : "Written Period",
            read:"Read",
            siteAboutTitle :"About the Website",
            numExtra :['-st ','-nd ','-rd ','-th ']
        }; 
        
    }
  };