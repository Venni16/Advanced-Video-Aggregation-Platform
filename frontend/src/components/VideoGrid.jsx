import { VideoCard, VideoCardSkeleton } from './VideoCard';

export const VideoGrid = ({ videos, isLoading, count = 12, error }) => {
    if (error) {
        return (
            <div className="error-banner">
                ⚠ Failed to load videos: {error.message}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="video-grid">
                {Array.from({ length: count }).map((_, i) => (
                    <VideoCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!videos?.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🎮</div>
                <p className="empty-title">No videos found</p>
                <p>Try a different genre or search term.</p>
            </div>
        );
    }

    return (
        <div className="video-grid">
            {videos.map((v) => (
                <VideoCard key={v.video_id} video={v} />
            ))}
        </div>
    );
};
