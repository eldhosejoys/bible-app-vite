import { useParams } from "react-router-dom";
import Content from "../components/Content";
import { bookMap } from "../config/siteConfig";

export default function VerseRoute() {
    const { book, chapterOrChapterVerse, verse } = useParams();

    // Match chapter + optional verse (from either ":verse" or "/verse")
    const match = `${chapterOrChapterVerse || ""}${verse ? "/" + verse : ""}`
        .match(/^(\d+)(?::(\d+)|\/(\d+))?/);

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

    const chapterNum = match?.[1]?.trim();
    const verseNum = (match?.[2] || match?.[3])?.trim();
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
