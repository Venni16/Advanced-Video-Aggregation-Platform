import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VideoGrid } from '../components/VideoGrid';
import { Pagination } from '../components/Pagination';
import { useVideos, useGenres } from '../hooks/useVideos';

/** Convert slug back to genre name */
const slugToGenre = (slug, genres) => {
    if (!slug || slug === 'all') return null;
    const found = genres?.find(g => g.slug === slug);
    return found?.name || null;
};

const GENRE_EMOJIS = {
    'BGMI': '🔫', 'Free Fire': '🔥', 'GTA V': '🚗',
    'Minecraft': '⛏️', 'Valorant': '💠', 'Call of Duty': '🎯',
    'eSports': '🏆', 'Streaming Commentary': '🎙️', 'Others': '🎲',
};

export const GenrePage = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(1);
    const { data: genreData } = useGenres();
    const genre = slugToGenre(slug, genreData?.genres);

    const { data, isLoading, error } = useVideos({ genre, page, limit: 24 });

    const emoji = GENRE_EMOJIS[genre] || '🎮';
    const displayName = genre || 'All Videos';

    return (
        <div className="page-content fade-up">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: '2rem' }}>{emoji}</span>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{displayName}</h1>
                    {data?.total > 0 && (
                        <span style={{
                            background: 'rgba(124,58,237,0.15)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            color: 'var(--accent-secondary)',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                        }}>{data.total} videos</span>
                    )}
                </div>
                {/* Genre pills for quick switching */}
                <div className="genre-pills-strip" style={{ marginTop: 16 }}>
                    <Link to="/"><button className={`genre-pill-btn${!slug ? ' active' : ''}`}>All</button></Link>
                    {genreData?.genres?.filter(g => g.name !== 'All').map((g) => (
                        <Link key={g.name} to={`/genre/${g.slug}`}>
                            <button className={`genre-pill-btn${g.slug === slug ? ' active' : ''}`}>{g.name}</button>
                        </Link>
                    ))}
                </div>
            </div>

            <VideoGrid videos={data?.videos} isLoading={isLoading} error={error} count={24} />

            {data && (
                <Pagination
                    page={page}
                    hasMore={data.hasMore}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                />
            )}
        </div>
    );
};
