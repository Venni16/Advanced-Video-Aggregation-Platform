import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VideoGrid } from '../components/VideoGrid';
import { Pagination } from '../components/Pagination';
import { useVideos, useLiveStreams, useGenres } from '../hooks/useVideos';
import { VideoCard } from '../components/VideoCard';

export const HomePage = () => {
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = useVideos({ page, limit: 24 });
    const { data: liveData } = useLiveStreams();
    const { data: genreData } = useGenres();

    const liveStreams = liveData?.streams?.slice(0, 4) || [];
    const genres = genreData?.genres?.filter(g => g.name !== 'All') || [];

    return (
        <div className="page-content fade-up">
            {/* ── Hero ── */}
            <section className="hero">
                <h1 className="hero-title">
                    The Home of<br />
                    <span className="gradient-text">Tamil Gaming</span>
                </h1>
                <p className="hero-sub">
                    Discover the best Tamil gaming content on YouTube. Browse by genre, watch live streams, and never miss a match.
                </p>
                <div className="hero-stats">
                    <div>
                        <div className="hero-stat-value">{data?.total ? (data.total > 999 ? '1K+' : data.total) : '—'}</div>
                        <div className="hero-stat-label">Videos</div>
                    </div>
                    <div>
                        <div className="hero-stat-value">{liveStreams.length || '—'}</div>
                        <div className="hero-stat-label">Live Now</div>
                    </div>
                    <div>
                        <div className="hero-stat-value">{genres.length || 9}</div>
                        <div className="hero-stat-label">Genres</div>
                    </div>
                </div>
            </section>

            {/* ── Genre quick-nav pills ── */}
            {genres.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <div className="genre-pills-strip">
                        {genres.map((g) => (
                            <Link key={g.name} to={`/genre/${g.slug}`}>
                                <button className="genre-pill-btn">{g.name}</button>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Live Streams ── */}
            {liveStreams.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="dot" />
                            🔴 Live Now
                        </h2>
                        <Link to="/live" className="view-all-link">View all →</Link>
                    </div>
                    <div className="video-grid">
                        {liveStreams.map((v) => (
                            <VideoCard key={v.video_id} video={v} />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Latest Videos ── */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="dot" />
                        Latest Videos
                    </h2>
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
            </section>
        </div>
    );
};
