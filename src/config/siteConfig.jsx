export const siteConfig = () => {
  const config = {
    bibleurl: "/assets/json/bible.json",
    eng_bibleurl: "/assets/json/eng-bible.json",
    headingurl: "/assets/json/headings/bibleheadings.json",
    titleurl: "/assets/json/title.json",
    headings: { 
      1: "/assets/json/headings/1.json",
      2: "/assets/json/headings/2.json",
      40: "/assets/json/headings/40.json",
      41: "/assets/json/headings/41.json",
      42: "/assets/json/headings/42.json",
      43: "/assets/json/headings/43.json",
      44: "/assets/json/headings/44.json",
      45: "/assets/json/headings/45.json",
      46: "/assets/json/headings/46.json",
      47: "/assets/json/headings/47.json",
      48: "/assets/json/headings/48.json",
      59: "/assets/json/headings/59.json",
      60: "/assets/json/headings/60.json",
      61: "/assets/json/headings/61.json",
      62: "/assets/json/headings/62.json",
      63: "/assets/json/headings/63.json",
      64: "/assets/json/headings/64.json",
      65: "/assets/json/headings/65.json",
      66: "/assets/json/headings/66.json"
    },
  };
  return config;
};

export const getBible =  () => {
  const bibleLanguage = localStorage.getItem('bible-language');
  if(!bibleLanguage || bibleLanguage == 'Malayalam'){
    return siteConfig().bibleurl;
  }else{
    return siteConfig().eng_bibleurl;
  }
};