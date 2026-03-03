import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="empty-state fade-up">
                <div className="empty-icon">🕹️</div>
                <div style={{ fontSize: '4rem', fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
                <p className="empty-title" style={{ marginTop: 12 }}>Page not found</p>
                <p style={{ marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
                <button className="page-btn" onClick={() => navigate('/')}
                    style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }}>
                    🏠 Back to Home
                </button>
            </div>
        </div>
    );
};
