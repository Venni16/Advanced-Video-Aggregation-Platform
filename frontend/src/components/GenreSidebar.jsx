import { useNavigate, useParams } from 'react-router-dom';
import { useGenres } from '../hooks/useVideos';

const GENRE_EMOJIS = {
    'All': '🌐',
    'BGMI': '🔫',
    'Free Fire': '🔥',
    'GTA V': '🚗',
    'Minecraft': '⛏️',
    'Valorant': '💠',
    'Call of Duty': '🎯',
    'eSports': '🏆',
    'Streaming Commentary': '🎙️',
    'Others': '🎲',
};

export const GenreSidebar = () => {
    const navigate = useNavigate();
    const { slug } = useParams();
    const { data, isLoading } = useGenres();

    const genres = data?.genres || [];
    const currentSlug = slug || 'all';

    const handleGenreClick = (genre) => {
        if (genre.name === 'All') {
            navigate('/');
        } else {
            navigate(`/genre/${genre.slug}`);
        }
    };

    return (
        <aside className="sidebar">
            <p className="sidebar-title">Genres</p>

            {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ margin: '0 20px 10px', height: 32, borderRadius: 8 }} className="skeleton" />
                ))
            ) : (
                genres.map((genre) => {
                    const genreSlug = genre.name === 'All' ? 'all' : genre.slug;
                    const isActive = currentSlug === genreSlug || (genre.name === 'All' && currentSlug === 'all');
                    const emoji = GENRE_EMOJIS[genre.name] || '🎮';

                    return (
                        <div
                            key={genre.name}
                            className={`genre-item${isActive ? ' active' : ''}`}
                            onClick={() => handleGenreClick(genre)}
                            title={genre.name}
                        >
                            <span style={{ fontSize: '1rem' }}>{emoji}</span>
                            <span style={{ flex: 1 }}>{genre.name}</span>
                            {genre.live_count > 0 && (
                                <span className="genre-live-badge">LIVE</span>
                            )}
                            {genre.count > 0 && (
                                <span className="genre-count">{genre.count > 999 ? '999+' : genre.count}</span>
                            )}
                        </div>
                    );
                })
            )}
        </aside>
    );
};
