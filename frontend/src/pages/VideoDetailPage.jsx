import { useParams, Link, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoGrid } from '../components/VideoGrid';
import { LiveBadge } from '../components/LiveBadge';
import { useVideo, useVideos } from '../hooks/useVideos';

const fmtNumber = (n) => n ? Number(n).toLocaleString() : '0';

const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

export const VideoDetailPage = () => {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { data, isLoading, error } = useVideo(videoId);
    const video = data?.video;

    const { data: relatedData } = useVideos({
        genre: video?.genre,
        limit: 6,
    });

    const related = relatedData?.videos?.filter(v => v.video_id !== videoId) || [];

    if (isLoading) {
        return (
            <div className="page-content">
                <div style={{ aspectRatio: '16/9', borderRadius: 14, marginBottom: 20 }} className="skeleton" />
                <div style={{ height: 28, width: '60%', marginBottom: 12 }} className="skeleton" />
                <div style={{ height: 18, width: '35%' }} className="skeleton" />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="page-content">
                <div className="empty-state">
                    <div className="empty-icon">😕</div>
                    <p className="empty-title">Video not found</p>
                    <button
                        className="page-btn"
                        style={{ marginTop: 20 }}
                        onClick={() => navigate(-1)}
                    >
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content fade-up">
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Link to="/" style={{ color: 'var(--accent-secondary)' }}>Home</Link>
                    <span>›</span>
                    {video.genre && video.genre !== 'Others' && (
                        <>
                            <Link to={`/genre/${video.genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                                style={{ color: 'var(--accent-secondary)' }}>
                                {video.genre}
                            </Link>
                            <span>›</span>
                        </>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {video.title}
                    </span>
                </div>

                {/* Player */}
                <VideoPlayer videoId={video.video_id} title={video.title} />

                {/* Title & Meta */}
                <h1 className="video-detail-title">{video.title}</h1>

                <div className="video-detail-meta">
                    {video.live_status === 'live' && <LiveBadge size="lg" />}
                    {video.channel_name && (
                        <span className="video-detail-channel">📺 {video.channel_name}</span>
                    )}
                    {video.published_at && <span>📅 {fmtDate(video.published_at)}</span>}
                    {video.view_count > 0 && <span>👁 {fmtNumber(video.view_count)} views</span>}
                    {video.like_count > 0 && <span>👍 {fmtNumber(video.like_count)}</span>}
                    {video.genre && (
                        <span className="genre-pill" style={{ marginLeft: 'auto' }}>{video.genre}</span>
                    )}
                </div>

                {/* Description */}
                {video.description && (
                    <div style={{
                        marginTop: 20,
                        padding: '16px 20px',
                        background: 'var(--bg-card)',
                        borderRadius: 10,
                        border: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-line',
                        maxHeight: 160,
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        {video.description.substring(0, 400)}
                        {video.description.length > 400 && (
                            <a
                                href={`https://www.youtube.com/watch?v=${video.video_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent-secondary)', display: 'block', marginTop: 8, fontSize: '0.8rem' }}
                            >
                                Read more on YouTube ↗
                            </a>
                        )}
                    </div>
                )}

                {/* Open in YouTube link */}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <a
                        href={`https://www.youtube.com/watch?v=${video.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="page-btn"
                        style={{ display: 'inline-block', color: 'var(--accent-secondary)' }}
                    >
                        ▶ Open on YouTube ↗
                    </a>
                </div>
            </div>

            {/* Related videos */}
            {related.length > 0 && (
                <div style={{ marginTop: 48 }}>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="dot" />
                            More {video.genre} Videos
                        </h2>
                    </div>
                    <VideoGrid videos={related} isLoading={false} count={6} />
                </div>
            )}
        </div>
    );
};
