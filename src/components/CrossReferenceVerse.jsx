import { Link } from "react-router-dom";
import { getLanguage } from '../config/Utils';

function CrossReferenceVerse({ to, fullBibleData, titles }) {
  const startRef = to[0];
  const endRef = to.length > 1 ? to[1] : startRef;
  const [startBook, startChapter, startVerse] = startRef.split('/').map(Number);
  const [endBook, endChapter, endVerse] = endRef.split('/').map(Number);

  const referencedVerses = fullBibleData.filter(verse => {
    const verseBook = Number(verse.b);
    const verseChapter = Number(verse.c);
    const verseNum = Number(verse.v);
    if (verseBook !== startBook) return false;
    if (startChapter === endChapter) return (verseChapter === startChapter && verseNum >= startVerse && verseNum <= endVerse);
    const inStartChapter = (verseChapter === startChapter && verseNum >= startVerse);
    const inEndChapter = (verseChapter === endChapter && verseNum <= endVerse);
    const inMiddleChapter = (verseChapter > startChapter && verseChapter < endChapter);
    return inStartChapter || inEndChapter || inMiddleChapter;
  });

  if (referencedVerses.length === 0) return null;

  const bookInfo = titles.find(t => t.n === startBook);
  const bookName = bookInfo ? (!getLanguage() || getLanguage() === "Malayalam" ? bookInfo.bm : bookInfo.be) : `Book ${startBook}`;
  const referenceTitle = startRef === endRef
    ? `${bookName} ${startChapter}:${startVerse}`
    : startChapter === endChapter
      ? `${bookName} ${startChapter}:${startVerse}-${endVerse}`
      : `${bookName} ${startChapter}:${startVerse} - ${endChapter}:${endVerse}`;

  return (
    <div className="p-2 mt-2 border rounded" style={{ color: '#000', backgroundColor: '#faebd7' }}>
      <p className="fw-bold mb-1"><Link to={`/${startRef}`} className="text-decoration-none text-danger" title={referenceTitle}>{referenceTitle}</Link></p>
      {referencedVerses.map(verse => (
        <span key={verse.v}><strong className="me-1">{verse.v}</strong>{verse.t}{' '}</span>
      ))}
    </div>
  );
}

export default CrossReferenceVerse;