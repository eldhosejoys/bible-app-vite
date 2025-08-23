import { useParams } from 'react-router-dom';
import Content from '../components/Content';

export default function VerseRoute() {
    const { book, chapterOrChapterVerse, verse } = useParams();

    let chapterNum = null;
    let verseNum = null;

    if (verse) {
        // URL: /book/chapter/verse
        chapterNum = chapterOrChapterVerse;
        verseNum = verse;
    } else if (chapterOrChapterVerse) {
        // URL: /book/chapter or /book/chapter:verse
        if (chapterOrChapterVerse.includes(':')) {
            [chapterNum, verseNum] = chapterOrChapterVerse.split(':');
        } else {
            chapterNum = chapterOrChapterVerse;
        }
    }

    // Trim whitespace
    const cleanBook = book?.trim();
    const cleanChapter = chapterNum?.trim();
    const cleanVerse = verseNum?.trim();

    console.log('Parsed Params:', { cleanBook, cleanChapter, cleanVerse });
    if (cleanBook && cleanChapter && cleanVerse) {
        return <Content book={cleanBook} chapter={cleanChapter} verse={cleanVerse} />;
    } else if (cleanBook && cleanChapter) {
        return <Content book={cleanBook} chapter={cleanChapter} />;
    } else if (cleanBook) {
        return <Content book={cleanBook}/>;
    } else {
        return null;
    }

}
