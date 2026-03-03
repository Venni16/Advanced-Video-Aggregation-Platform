import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { GenreSidebar } from './components/GenreSidebar';
import { HomePage } from './pages/HomePage';
import { GenrePage } from './pages/GenrePage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { LivePage } from './pages/LivePage';
import { SearchPage } from './pages/SearchPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <Navbar />
                <div className="main-layout">
                    {/* Genre sidebar hidden on video detail / search for more space */}
                    <Routes>
                        <Route path="/video/:videoId" element={null} />
                        <Route path="*" element={<GenreSidebar />} />
                    </Routes>

                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/genre/:slug" element={<GenrePage />} />
                        <Route path="/video/:videoId" element={<VideoDetailPage />} />
                        <Route path="/live" element={<LivePage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}
