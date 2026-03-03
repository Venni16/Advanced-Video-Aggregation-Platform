import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VideoGrid } from '../components/VideoGrid';
import { Pagination } from '../components/Pagination';
import { useSearch } from '../hooks/useVideos';

export const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const q = searchParams.get('q') || '';
    const [localQ, setLocalQ] = useState(q);
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useSearch({ q, page, limit: 24 });

    // Reset page when query changes
    useEffect(() => {
        setPage(1);
        setLocalQ(q);
    }, [q]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = localQ.trim();
        if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    };

    return (
        <div className="page-content fade-up">
            {/* Search form */}
            <form onSubmit={handleSubmit} style={{ marginBottom: 28, maxWidth: 560 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 16 }}>Search Videos</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <input
                        className="search-input"
                        style={{ flex: 1, padding: '10px 16px', fontSize: '0.95rem' }}
                        type="text"
                        value={localQ}
                        onChange={(e) => setLocalQ(e.target.value)}
                        placeholder="Search Tamil gaming videos..."
                        autoFocus
                        aria-label="Search query"
                    />
                    <button
                        type="submit"
                        className="page-btn"
                        style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '10px 20px' }}
                    >
                        Search
                    </button>
                </div>
            </form>

            {/* Results header */}
            {q && (
                <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {isLoading
                        ? 'Searching…'
                        : data?.total > 0
                            ? `Found ${data.total} result${data.total !== 1 ? 's' : ''} for "${q}"`
                            : `No results for "${q}"`}
                </div>
            )}

            <VideoGrid videos={data?.videos} isLoading={isLoading} error={error} count={24} />

            {data?.hasMore && (
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
