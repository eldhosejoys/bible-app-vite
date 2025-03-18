import { getLanguage , setLanguage } from '../config/Utils';

export const siteConfig = () => {
  const config = {
    bibleurl: "/assets/json/bible.json",
    eng_bibleurl: "/assets/json/eng-bible.json",
    hin_bibleurl: "/assets/json/hin-bible.json",
    tam_bibleurl: "/assets/json/tam-bible.json",
    telu_bibleurl: "/assets/json/telu-bible.json",
    intro_url: "/assets/json/intro.json",
    headingurl: "/assets/json/headings/bibleheadings.json",  // This is actually used in the code
    titleurl: "/assets/json/title.json",
    headings: { 
      1: "/assets/json/headings/1.json",
      2: "/assets/json/headings/2.json",
      3: "/assets/json/headings/3.json",
      4: "/assets/json/headings/4.json",
      5: "/assets/json/headings/5.json",
      6: "/assets/json/headings/6.json",
      7: "/assets/json/headings/7.json",
      8: "/assets/json/headings/8.json",
      9: "/assets/json/headings/9.json",
      10: "/assets/json/headings/10.json",
      11: "/assets/json/headings/11.json",
      12: "/assets/json/headings/12.json",
      13: "/assets/json/headings/13.json",
      14: "/assets/json/headings/14.json",
      15: "/assets/json/headings/15.json",
      16: "/assets/json/headings/16.json",
      17: "/assets/json/headings/17.json",
      18: "/assets/json/headings/18.json",
      19: "/assets/json/headings/19.json",
      20: "/assets/json/headings/20.json",
      21: "/assets/json/headings/21.json",
      22: "/assets/json/headings/22.json",
      23: "/assets/json/headings/23.json",
      24: "/assets/json/headings/24.json",
      25: "/assets/json/headings/25.json",
      26: "/assets/json/headings/26.json",
      27: "/assets/json/headings/27.json",
      28: "/assets/json/headings/28.json",
      29: "/assets/json/headings/29.json",
      30: "/assets/json/headings/30.json",
      31: "/assets/json/headings/31.json",
      32: "/assets/json/headings/32.json",
      33: "/assets/json/headings/33.json",
      34: "/assets/json/headings/34.json",
      35: "/assets/json/headings/35.json",
      36: "/assets/json/headings/36.json",
      37: "/assets/json/headings/37.json",
      38: "/assets/json/headings/38.json",
      39: "/assets/json/headings/39.json",
      40: "/assets/json/headings/40.json",
      41: "/assets/json/headings/41.json",
      42: "/assets/json/headings/42.json",
      43: "/assets/json/headings/43.json",
      44: "/assets/json/headings/44.json",
      45: "/assets/json/headings/45.json",
      46: "/assets/json/headings/46.json",
      47: "/assets/json/headings/47.json",
      48: "/assets/json/headings/48.json",
      49: "/assets/json/headings/49.json",
      50: "/assets/json/headings/50.json",
      51: "/assets/json/headings/51.json",
      52: "/assets/json/headings/52.json",
      53: "/assets/json/headings/53.json",
      54: "/assets/json/headings/54.json",
      55: "/assets/json/headings/55.json",
      56: "/assets/json/headings/56.json",
      57: "/assets/json/headings/57.json",
      58: "/assets/json/headings/58.json",
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
  const bibleLanguage = getLanguage();
  if(!bibleLanguage || bibleLanguage == 'Malayalam'){
    setLanguage('Malayalam');
    return siteConfig().bibleurl;
  }else if(bibleLanguage == 'Hindi'){
    setLanguage('Hindi');
    return siteConfig().hin_bibleurl;
  }else if(bibleLanguage == 'Tamil'){
    setLanguage('Tamil');
    return siteConfig().tam_bibleurl;
  }else if(bibleLanguage == 'Telugu'){
    setLanguage('Telugu');
    return siteConfig().telu_bibleurl;
  }else{
    return siteConfig().eng_bibleurl;
  }
};