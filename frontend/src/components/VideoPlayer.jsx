export const VideoPlayer = ({ videoId, title }) => {
    if (!videoId) return null;

    return (
        <div className="video-player-wrap">
            <iframe
                id={`player-${videoId}`}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
                title={title || 'YouTube video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
};
