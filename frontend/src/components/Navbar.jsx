import { useState, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';

export const Navbar = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        const q = query.trim();
        if (q) {
            navigate(`/search?q=${encodeURIComponent(q)}`);
            setQuery('');
            inputRef.current?.blur();
        }
    };

    return (
        <nav className="navbar">
            {/* Logo */}
            <NavLink to="/" className="navbar-logo">
                <div className="navbar-logo-icon">🎮</div>
                <span>Tamil<span className="accent">Gaming</span>.tv</span>
            </NavLink>

            {/* Nav links */}
            <div className="navbar-nav">
                <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Home
                </NavLink>
                <NavLink to="/live" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Live
                </NavLink>
                <NavLink to="/genre/bgmi" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Browse
                </NavLink>
            </div>

            <div className="navbar-spacer" />

            {/* Search */}
            <form className="search-form" onSubmit={handleSearch}>
                <input
                    ref={inputRef}
                    className="search-input"
                    type="text"
                    placeholder="Search videos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search videos"
                />
                <button type="submit" className="search-btn" aria-label="Submit search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                </button>
            </form>

            {/* Live shortcut */}
            <NavLink to="/live" className="navbar-live-btn">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulse-live 1.5s infinite', display: 'inline-block' }} />
                LIVE
            </NavLink>
        </nav>
    );
};
