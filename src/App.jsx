import './App.css';
import { Routes, Route } from 'react-router-dom';
import Index from './components/Index';
import Header from './include/Header';
import Error from './components/Error';
import Footer from './include/Footer';
import Settings from './features/Settings';
import About from './components/About';
import { Search } from './components/Search';
import VerseRoute from './routes/VerseRoute';
import Bookmarks from './components/Bookmarks';
import Notes from './components/Notes';
import Highlights from './components/Highlights';
import History from './components/History';

function App() {
    return (
        <>
            <div className="d-flex flex-column hv-100" style={{ minHeight: "100vh" }}>
                <main className="flex-shrink-0" style={{ flex: "1 0 auto" }}>
                    <Header />
                    <Routes>
                        <Route path='/' element={<Index />} />
                        <Route path='/search' element={<Search />} />
                        <Route path='/settings' element={<Settings />} />
                        <Route path='/about' element={<About />} />
                        <Route path='/bookmarks' element={<Bookmarks />} />
                        <Route path='/notes' element={<Notes />} />
                        <Route path='/highlights' element={<Highlights />} />
                        <Route path='/history' element={<History />} />
                        {/* Single flexible route for all book/chapter/verse formats */}
                        <Route path='/:book/:chapterOrChapterVerse?/:verse?' element={<VerseRoute />} />
                        <Route path='*' element={<Error />} status={404} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </>
    );
}

export default App;
