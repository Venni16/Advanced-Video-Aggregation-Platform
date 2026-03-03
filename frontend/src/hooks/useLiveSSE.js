import { useEffect, useRef, useCallback } from 'react';

/**
 * Subscribe to Server-Sent Events from /api/live/stream
 * Calls onUpdate(data) whenever a live-update event arrives.
 */
export const useLiveSSE = (onUpdate) => {
    const esRef = useRef(null);
    const cbRef = useRef(onUpdate);
    cbRef.current = onUpdate;

    const connect = useCallback(() => {
        if (esRef.current) esRef.current.close();

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const es = new EventSource(`${baseUrl}/live/stream`);
        esRef.current = es;

        es.addEventListener('live-update', (e) => {
            try {
                const data = JSON.parse(e.data);
                cbRef.current?.(data);
            } catch {
                // ignore malformed events
            }
        });

        es.addEventListener('ping', () => {
            // keepalive — no action needed
        });

        es.onerror = () => {
            es.close();
            esRef.current = null;
            // Reconnect after 5 seconds on error
            setTimeout(connect, 5000);
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            esRef.current?.close();
            esRef.current = null;
        };
    }, [connect]);
};
