import { useParams, useNavigate } from "react-router-dom";
import Content from "../components/Content";
import { bookMap } from "../config/siteConfig";

export default function VerseRoute() {
  const { book, chapterOrChapterVerse, verse } = useParams();
  const navigate = useNavigate();

  // helper to normalize book param
  function getBookNumber(book) {
    if (!book) return null;
    const key = book.trim().toLowerCase();
    if (!isNaN(key)) {
      const num = parseInt(key, 10);
      return num >= 1 && num <= 66 ? num : null;
    }
    return bookMap[key] || null;
  }

  const bookNum = getBookNumber(book);

  let chapterNum = null;
  let verseNum = null;

  if (verse) {
    chapterNum = chapterOrChapterVerse?.trim();
    verseNum = verse?.trim();
  } else if (chapterOrChapterVerse) {
    if (chapterOrChapterVerse.includes(":")) {
      [chapterNum, verseNum] = chapterOrChapterVerse.split(":").map(s => s.trim());
    } else {
      chapterNum = chapterOrChapterVerse.trim();
    }
  }

  // --- Navigation conditions ---
  if (!bookNum) {
    navigate("/1/1");
    return null;
  } else if (bookNum > 66) {
    navigate("/66/1");
    return null;
  } else if (bookNum < 1) {
    navigate("/1/1");
    return null;
  } else if ((!chapterNum || isNaN(parseInt(chapterNum)) || parseInt(chapterNum) <= 0) && chapterNum !== 'info') {
    navigate(`/${bookNum}/1`);
    return null;
  }

  // --- Render content ---
  if (bookNum && chapterNum && verseNum) {
    return <Content book={bookNum} chapter={chapterNum} verse={verseNum} />;
  }
  if (bookNum && chapterNum) {
    return <Content book={bookNum} chapter={chapterNum} />;
  }
  if (bookNum) {
    return <Content book={bookNum} />;
  }
  return null;
}
