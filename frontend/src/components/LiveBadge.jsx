export const LiveBadge = ({ size = 'sm' }) => (
    <div className="live-badge" style={size === 'lg' ? { fontSize: '0.75rem', padding: '4px 10px' } : {}}>
        <span className="live-dot" />
        LIVE
    </div>
);
