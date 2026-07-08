import './App.css';
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from './components/Index';
import Header from './include/Header';
import Error from './components/Error';
import Footer from './include/Footer';
import VerseRoute from './routes/VerseRoute';

// Lazy load secondary routes to optimize initial bundle size
const Settings = lazy(() => import('./features/Settings'));
const About = lazy(() => import('./components/About'));
const Privacy = lazy(() => import('./components/Privacy'));
const Search = lazy(() => import('./components/Search').then(module => ({ default: module.Search })));
const Bookmarks = lazy(() => import('./components/Bookmarks'));
const Notes = lazy(() => import('./components/Notes'));
const Highlights = lazy(() => import('./components/Highlights'));
const History = lazy(() => import('./components/History'));

const PageLoader = () => (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    </div>
);

function App() {
    return (
        <>
            <div className="d-flex flex-column hv-100" style={{ minHeight: "100vh" }}>
                <main className="flex-shrink-0" style={{ flex: "1 0 auto" }}>
                    <Header />
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path='/' element={<Index />} />
                            <Route path='/search' element={<Search />} />
                            <Route path='/settings' element={<Settings />} />
                            <Route path='/about' element={<About />} />
                            <Route path='/privacy' element={<Privacy />} />
                            <Route path='/bookmarks' element={<Bookmarks />} />
                            <Route path='/notes' element={<Notes />} />
                            <Route path='/highlights' element={<Highlights />} />
                            <Route path='/history' element={<History />} />
                            {/* Single flexible route for all book/chapter/verse formats */}
                            <Route path='/:book/:chapterOrChapterVerse?/:verse?' element={<VerseRoute />} />
                            <Route path='*' element={<Error />} status={404} />
                        </Routes>
                    </Suspense>
                </main>
                <Footer />
            </div>
        </>
    );
}

export default App;
