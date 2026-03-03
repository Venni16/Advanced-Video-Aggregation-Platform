import { useNavigate } from 'react-router-dom';
import { LiveBadge } from './LiveBadge';

/** Format a big number to short string, e.g. 1200000 → "1.2M" */
const fmtViews = (n) => {
    if (!n) return '';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
    return `${n} views`;
};

/** Parse ISO 8601 duration (PT4M13S → "4:13") */
const fmtDuration = (iso) => {
    if (!iso) return '';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const [, h, m, s] = match;
    const hours = parseInt(h || 0);
    const mins = parseInt(m || 0);
    const secs = parseInt(s || 0);
    if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const VideoCard = ({ video }) => {
    const navigate = useNavigate();
    const isLive = video.live_status === 'live';
    const duration = fmtDuration(video.duration);

    return (
        <div className="video-card fade-up" onClick={() => navigate(`/video/${video.video_id}`)}>
            <div className="video-thumb-wrap">
                {video.thumbnail_url ? (
                    <img
                        className="video-thumb"
                        src={video.thumbnail_url}
                        alt={video.title}
                        loading="lazy"
                    />
                ) : (
                    <div className="video-thumb" style={{
                        background: 'linear-gradient(135deg, #1a1a35, #2a1a55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.1)', fontSize: '2rem'
                    }}>🎮</div>
                )}
                {isLive && <LiveBadge />}
                {!isLive && duration && <span className="video-duration">{duration}</span>}
            </div>

            <div className="video-body">
                <p className="video-title">{video.title}</p>
                <div className="video-meta">
                    <span className="video-channel">{video.channel_name}</span>
                    {video.view_count > 0 && (
                        <span className="video-views">{fmtViews(video.view_count)}</span>
                    )}
                </div>
                {video.genre && video.genre !== 'Others' && (
                    <div style={{ marginTop: 8 }}>
                        <span className="genre-pill">{video.genre}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/** Loading skeleton */
export const VideoCardSkeleton = () => (
    <div className="skeleton-card">
        <div className="skeleton-thumb skeleton" />
        <div className="skeleton-body">
            <div className="skeleton-title skeleton" />
            <div className="skeleton-title skeleton" style={{ width: '70%' }} />
            <div className="skeleton-sub skeleton" />
        </div>
    </div>
);
