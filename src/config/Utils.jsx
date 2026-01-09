import axios from 'axios';

let cancelToken;

export const transliterate = async (word) => {
  // Skip transliteration if input has only digits, /, -, , or .
  if (/[0-9\-\/,?:_]/.test(word)) {
    return [word];
  }

  // Cancel the previous request (if any)
  if (cancelToken) {
    cancelToken.cancel("New request made");
  }

  cancelToken = axios.CancelToken.source();
  let langCode = getLanguageCode();
  const url = `https://inputtools.google.com/request?text=${word}&itc=${langCode}-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;

  try {
    const response = await axios.get(url, {
      cancelToken: cancelToken.token,
    });
    const transliteratedValue = response.data[1][0][1];
    return transliteratedValue;
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log(error);
    }
    return [];
  }
};




export const copyToClipBoard = async (copyMe, index, itemsRef, itemsRef2) => {
  try {
    await navigator.clipboard.writeText(copyMe);
    itemsRef2.current["c-" + index].style.setProperty('background-color', '#90EE90', 'important');
    itemsRef.current["c-" + index].src = '/assets/images/clipboard-check.svg';

    setTimeout(
      () => {
        itemsRef.current["c-" + index].src = '/assets/images/clipboard.svg';
        itemsRef2.current["c-" + index].style.backgroundColor = '';
      },
      3000
    );
  } catch (err) {
    itemsRef2.current["c-" + index].style.setProperty('background-color', '#FFCCCB', 'important');
    itemsRef.current["c-" + index].src = '/assets/images/clipboard-x.svg';
    setTimeout(
      () => {
        itemsRef.current["c-" + index].src = '/assets/images/clipboard.svg';
        itemsRef2.current["c-" + index].style.backgroundColor = '';
      },
      1000
    );
  }
}

// Function to add data into cache - now a no-op since service worker handles caching
// Keeping for backwards compatibility but it does nothing
export const addDataIntoCache = (cacheName, url, response) => {
  // Service worker handles all caching now via fetch event
  // This function is kept for backwards compatibility but does nothing
}

// Function to get cache data - searches all caches for the URL
export const getCacheData = async (cacheName, url) => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    console.warn('Cache API not available');
    return false;
  }

  // Try to find the response in any cache (service worker uses versioned cache names)
  const cachedResponse = await caches.match(url);
  if (!cachedResponse || !cachedResponse.ok) { return false }
  return await cachedResponse.json();
}

export const speakcontent = async (chap, verse, itemsRef, itemsRef2, itemsRef3, index, grouped = false) => {
  window.speechSynthesis.cancel();
  console.log("Speaking verse " + verse + " in index " + index);

  const data = JSON.parse(chap);
  const sentences = data.slice(verse).map(item => item.t);

  const indexFinder = (i) => {
    let idx = i;
    while (idx < itemsRef.current.length && !itemsRef.current[idx]) idx++;
    return idx;
  };

  const setStyles = (i, { src = '', bg2 = '', bg3 = '', color = '' } = {}) => {
    const idx = indexFinder(i);
    if (!itemsRef.current[idx]) return;
    itemsRef.current[idx].src = src;
    itemsRef2.current[idx].style.backgroundColor = bg2;
    itemsRef3.current[idx].style.backgroundColor = bg3;
    itemsRef3.current[idx].style.color = color;
    if (src.includes('stop')) itemsRef2.current[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetAll = () => {
    for (let i = 0; i < itemsRef3.current.length; i++) {
      setStyles(i, { src: '/assets/images/play.svg' });
    }
  };

  // toggle stop
  if (itemsRef.current[index]?.src.includes("stop.svg")) {
    setStyles(index, { src: '/assets/images/play.svg' });
    return;
  }

  resetAll();

  const playSentence = (sentence, i) =>
    new Promise((resolve, reject) => {
      const utter = new SpeechSynthesisUtterance(sentence);
      utter.lang = getLanguageCode();

      const targetIndex = grouped ? Math.max(index, verse + i) : verse + i;

      utter.onstart = () => setStyles(targetIndex, { src: '/assets/images/stop.svg', bg2: '#ffb380', bg3: '#faebd7', color: '#000' });
      utter.onerror = (e) => { window.speechSynthesis.cancel(); setStyles(targetIndex, { src: '/assets/images/play.svg' }); reject(e); };
      utter.onend = () => { setStyles(targetIndex, { src: '/assets/images/play.svg' }); resolve(); };

      window.speechSynthesis.speak(utter);
    });

  for (let i = 0; i < sentences.length; i++) {
    await playSentence(sentences[i], i);
  }
};


export const speaksearch = async (chap, index, itemsRef, itemsRef2, itemsRef3) => {
  window.speechSynthesis.cancel();

  // helper functions
  const resetStyles = (i) => {
    itemsRef.current[i].src = '/assets/images/play.svg';
    itemsRef2.current[i].style.backgroundColor = '';
    itemsRef3.current[i].style.backgroundColor = '';
    itemsRef3.current[i].style.color = '';
  };

  const highlight = (i) => {
    itemsRef.current[i].src = '/assets/images/stop.svg';
    itemsRef2.current[i].style.backgroundColor = '#ffb380';
    itemsRef3.current[i].style.backgroundColor = '#faebd7';
    itemsRef3.current[i].style.color = '#000';
    itemsRef2.current[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // toggle stop
  if (itemsRef.current[index].src.includes("stop.svg")) {
    resetStyles(index);
    return;
  }

  // play single sentence
  const sentence = chap;
  const utter = new SpeechSynthesisUtterance(sentence);
  utter.lang = getLanguageCode();

  utter.onstart = () => highlight(index);
  utter.onend = () => resetStyles(index);
  utter.onerror = () => {
    window.speechSynthesis.cancel();
    resetStyles(index);
  };

  window.speechSynthesis.speak(utter);
};


export const handleFontSize = async (value) => {
  localStorage.setItem('fontSize', 7 - value);
  const fontSizeVal = localStorage.getItem('fontSize');
  var elements = document.querySelectorAll('.words-text');
  for (var i = 0; i < elements.length; i++) {
    var classList = elements[i].classList;
    var foundClassStartingWithFs = false;
    for (var j = 0; j < classList.length; j++) {
      if (classList[j].match(/^fs-/)) {
        classList.replace(classList[j], 'fs-' + fontSizeVal);
        foundClassStartingWithFs = true;
        break;
      }
    }
    if (!foundClassStartingWithFs) {
      classList.add('fs-' + fontSizeVal);
    }
  }
};

export const handleCompact = async (value) => {
  // Removing the key to solve the problem arising due to cards not showing.
  if (!value) { localStorage.removeItem('compact'); } else {
    localStorage.setItem('compact', value);
  }

  var elements = document.querySelectorAll('.words-text-card');
  for (var i = 0; i < elements.length; i++) {
    var classList = elements[i].classList;
    if (!value) {
      classList.add('shadow-sm', 'card');
    } else {
      classList.remove('shadow-sm', 'card');
    }
    var playerDiv = elements[i].querySelector('.words-text-player');
    if (playerDiv) {
      if (value) {
        playerDiv.classList.add('d-none');
      } else {
        playerDiv.classList.remove('d-none');
      }
    }
  }

};

export const getLanguageCode = () => {
  const bibleLanguage = getLanguage();
  if (bibleLanguage == 'Hindi') {
    return 'hi';
  } else if (bibleLanguage == 'Tamil') {
    return 'ta';
  } else if (bibleLanguage == 'Telugu') {
    return 'te';
  } else {
    return 'ml';
  }
}

export const getLanguage = () => {
  return localStorage.getItem('bible-language');
};

export const setLanguage = (lang) => {
  localStorage.setItem('bible-language', lang);
  return true;
};

export const areReferencesEnabled = () => {
  return localStorage.getItem('showReferences') === 'true';
};
