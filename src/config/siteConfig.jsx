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
    cross_reference_path: "/assets/json/books-cross/",
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

// Map of book abbreviations → numbers (Protestant 66)
export const bookMap = {
    gen: 1, exod: 2, lev: 3, num: 4, deut: 5,
    josh: 6, judg: 7, ruth: 8, "1sam": 9, "2sam": 10,
    "1kings": 11, "2kings": 12, "1chr": 13, "2chr": 14,
    ezra: 15, neh: 16, esth: 17, job: 18, ps: 19,
    prov: 20, eccl: 21, song: 22, isa: 23, jer: 24,
    lam: 25, ezek: 26, dan: 27, hos: 28, joel: 29,
    amos: 30, obad: 31, jonah: 32, mic: 33, nah: 34,
    hab: 35, zeph: 36, hag: 37, zech: 38, mal: 39,
    matt: 40, mark: 41, luke: 42, john: 43, acts: 44,
    rom: 45, "1cor": 46, "2cor": 47, gal: 48, eph: 49,
    phil: 50, col: 51, "1thess": 52, "2thess": 53,
    "1tim": 54, "2tim": 55, titus: 56, phlm: 57,
    heb: 58, jas: 59, "1pet": 60, "2pet": 61,
    "1john": 62, "2john": 63, "3john": 64,
    jude: 65, rev: 66,
};