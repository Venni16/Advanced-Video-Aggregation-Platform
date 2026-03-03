import { useState, useCallback } from 'react';
import { VideoGrid } from '../components/VideoGrid';
import { VideoCard } from '../components/VideoCard';
import { LiveBadge } from '../components/LiveBadge';
import { useLiveStreams } from '../hooks/useVideos';
import { useLiveSSE } from '../hooks/useLiveSSE';
import { useQueryClient } from '@tanstack/react-query';

export const LivePage = () => {
    const { data, isLoading, error } = useLiveStreams();
    const queryClient = useQueryClient();
    const [notification, setNotification] = useState(null);

    // Real-time updates via SSE
    const handleLiveUpdate = useCallback((update) => {
        setNotification(`🔴 ${update.title || update.video_id} went ${update.live_status}`);
        setTimeout(() => setNotification(null), 5000);
        // Invalidate live query to force refetch
        queryClient.invalidateQueries({ queryKey: ['live'] });
    }, [queryClient]);

    useLiveSSE(handleLiveUpdate);

    const streams = data?.streams || [];

    return (
        <div className="page-content fade-up">
            {/* Header */}
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <LiveBadge size="lg" />
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Live Streams</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Tamil gaming channels streaming right now — auto-updates every 30 seconds
                    </p>
                </div>
                {data?.count > 0 && (
                    <div style={{
                        marginLeft: 'auto',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        padding: '8px 18px',
                        borderRadius: 10,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{data.count}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live</div>
                    </div>
                )}
            </div>

            {/* Real-time update notification toast */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 999,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fca5a5',
                    padding: '12px 20px',
                    borderRadius: 12,
                    fontSize: '0.875rem',
                    backdropFilter: 'blur(10px)',
                    animation: 'fadeUp 0.3s ease',
                    maxWidth: 320,
                }}>
                    {notification}
                </div>
            )}

            {/* Streams grid */}
            {!isLoading && !error && streams.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📡</div>
                    <p className="empty-title">No live streams right now</p>
                    <p>Check back soon — Tamil gaming channels go live frequently!</p>
                </div>
            ) : (
                <VideoGrid videos={streams} isLoading={isLoading} error={error} count={8} />
            )}
        </div>
    );
};
