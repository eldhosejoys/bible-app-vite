import { useParams } from "react-router-dom";
import Content from "../components/Content";
import { bookMap } from "../config/siteConfig";

export default function VerseRoute() {
  const { book, chapterOrChapterVerse, verse } = useParams();

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

  let chapterNum = null;
  let verseNum = null;

  if (verse) {
    // URL form: /book/chapter/verse
    chapterNum = chapterOrChapterVerse?.trim();
    verseNum = verse?.trim();
  } else if (chapterOrChapterVerse) {
    // URL form: /book/chapter or /book/chapter:verse
    if (chapterOrChapterVerse.includes(":")) {
      [chapterNum, verseNum] = chapterOrChapterVerse.split(":").map(s => s.trim());
    } else {
      chapterNum = chapterOrChapterVerse.trim();
    }
  }

  const bookNum = getBookNumber(book);

  console.log("Parsed Params:", { bookNum, chapterNum, verseNum });

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
