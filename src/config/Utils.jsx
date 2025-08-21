import axios from 'axios';

let cancelToken;

export const transliterate = async (word) => {
  // Cancel the previous request (if any)
  if (cancelToken) {
    cancelToken.cancel("New request made");
  }
  // Create a new CancelToken
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
    if (axios.isCancel(error)) {
      // console.log(error.message);
    } else {
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

// Function to add our give data into cache
export const addDataIntoCache = (cacheName, url, response) => {
  const data = new Response(JSON.stringify(response));
  if ('caches' in window) {
    caches.open(cacheName).then(function (cache) {
      return cache.addAll([
        url,
      ]);
    });
    // caches.open(cacheName).then((cache) => {
    //   cache.put(url, data);
    // });
  }
}

// Function to get cache data
export const getCacheData = async (cacheName, url) => {
  if (typeof window === 'undefined' || !('caches' in window)) {
    console.warn('Cache API not available');
    return false;
  }
  const cacheStorage = await caches.open(cacheName);
  const cachedResponse = await cacheStorage.match(url); // Returns a promise w/ matched cache
  if (!cachedResponse || !cachedResponse.ok) { return false }
  // console.log(await cachedResponse.json()); // prints json object with value of key matched
  return await cachedResponse.json();
}

export const speakcontent = async (chap, index, itemsRef, itemsRef2, itemsRef3) => {

  window.speechSynthesis.cancel();

  if (itemsRef.current[index].src.indexOf("stop.svg") != -1) { // contains play
    itemsRef.current[index].src = '/assets/images/play.svg';
    itemsRef2.current[index].style.backgroundColor = '';
    itemsRef3.current[index].style.backgroundColor = '';
    itemsRef3.current[index].style.color = '';
    return;
  }

  for (var i = 1; i < itemsRef3.current.length; i++) {
    if (itemsRef.current[i]) {
      itemsRef.current[i].src = '/assets/images/play.svg';
      itemsRef2.current[i].style.backgroundColor = '';
      itemsRef3.current[i].style.backgroundColor = '';
      itemsRef3.current[i].style.color = '';

    }
  }

  let sentences = [];
  for (var i = index; i < JSON.parse(chap).length; i++) {
    sentences.push(JSON.parse(chap)[i].t);
  }

  for (var i = 0; i < sentences.length; i++) {
    getNextAudio(sentences[i], i);
  }

  async function getNextAudio(sentence, i) {
    let audio = new SpeechSynthesisUtterance(sentence);
    audio.lang = getLanguageCode();
    window.speechSynthesis.speak(audio);
    let mestext = '';
    audio.onstart = (event) => {
      itemsRef.current[index + sentences.indexOf(event.utterance.text)].src = '/assets/images/stop.svg';
      itemsRef2.current[index + sentences.indexOf(event.utterance.text)].style.backgroundColor = '#ffb380';
      itemsRef3.current[index + sentences.indexOf(event.utterance.text)].style.backgroundColor = '#faebd7';
      itemsRef3.current[index + sentences.indexOf(event.utterance.text)].style.color = '#000';

      itemsRef2.current[index + sentences.indexOf(event.utterance.text)].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      mestext = event.utterance.text;
    }

    audio.onerror = (event) => {
      window.speechSynthesis.cancel();
      for (var i = 1; i < itemsRef3.current.length; i++) {
        if (itemsRef.current[i]) {
          itemsRef.current[i].src = '/assets/images/play.svg';
          itemsRef2.current[i].style.backgroundColor = '';
          itemsRef3.current[i].style.backgroundColor = '';
          itemsRef3.current[i].style.color = '';
        }
      }
      return;
    }
    audio.onend = (event) => {
      itemsRef.current[index + sentences.indexOf(mestext)].src = '/assets/images/play.svg';
      itemsRef2.current[index + sentences.indexOf(mestext)].style.backgroundColor = '';
      itemsRef3.current[index + sentences.indexOf(mestext)].style.backgroundColor = '';
      itemsRef3.current[index + sentences.indexOf(mestext)].style.color = '';
    }

    // return new Promise(resolve => {
    //   audio.onend = resolve;

    // });
  }

}


export const speaksearch = async (chap, index, itemsRef, itemsRef2, itemsRef3) => {
  window.speechSynthesis.cancel();
  if (itemsRef.current[index].src.indexOf("stop.svg") != -1) { // contains play
    itemsRef.current[index].src = '/assets/images/play.svg';
    itemsRef2.current[index].style.backgroundColor = '';
    itemsRef3.current[index].style.backgroundColor = '';
    itemsRef3.current[index].style.color = '';

    return;
  }

  let sentences = [];
  sentences.push(chap);
  getNextAudio(sentences[0], 0);

  async function getNextAudio(sentence, i) {

    let audio = new SpeechSynthesisUtterance(sentence);
    audio.lang = getLanguageCode();
    window.speechSynthesis.speak(audio);
    let mestext = '';
    audio.onstart = (event) => {
      itemsRef.current[index + sentences.indexOf(event.utterance.text)].src = '/assets/images/stop.svg';
      itemsRef2.current[index + sentences.indexOf(event.utterance.text)].style.backgroundColor = '#ffb380';
      itemsRef3.current[index + sentences.indexOf(event.utterance.text)].style.backgroundColor = '#faebd7';
      itemsRef3.current[index + sentences.indexOf(event.utterance.text)].style.color = '#000';

      itemsRef2.current[index + sentences.indexOf(event.utterance.text)].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      mestext = event.utterance.text;
    }
    audio.onend = (event) => {
      itemsRef.current[index + sentences.indexOf(mestext)].src = '/assets/images/play.svg';
      itemsRef2.current[index + sentences.indexOf(mestext)].style.backgroundColor = '';
      itemsRef3.current[index + sentences.indexOf(mestext)].style.backgroundColor = '';
      itemsRef3.current[index + sentences.indexOf(mestext)].style.color = '';

    }
  }

}

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
