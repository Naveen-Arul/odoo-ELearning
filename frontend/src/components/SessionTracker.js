/**
 * SessionTracker - Hidden component that tracks user session time
 * Sends periodic heartbeats to the backend to record study time
 */

import { useEffect, useRef } from 'react';
import { userAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const HEARTBEAT_INTERVAL = 60000; // 1 minute in milliseconds

export default function SessionTracker() {
    const { isAuthenticated, token } = useAuthStore();
    const intervalRef = useRef(null);
    const lastHeartbeatRef = useRef(null);

    useEffect(() => {
        // Only track if user is authenticated
        if (!isAuthenticated || !token) {
            return;
        }

        // Send initial heartbeat
        sendHeartbeat();

        // Set up interval for periodic heartbeats
        intervalRef.current = setInterval(() => {
            sendHeartbeat();
        }, HEARTBEAT_INTERVAL);

        // Handle visibility change (user switches tabs/minimizes)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User left the tab - clear interval
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else {
                // User returned - send heartbeat and restart interval
                sendHeartbeat();
                if (!intervalRef.current) {
                    intervalRef.current = setInterval(() => {
                        sendHeartbeat();
                    }, HEARTBEAT_INTERVAL);
                }
            }
        };

        // Handle before unload (user closes tab)
        const handleBeforeUnload = () => {
            // Send final heartbeat using sendBeacon for reliability
            const data = JSON.stringify({ minutes: 1 });
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/users/heartbeat', blob);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isAuthenticated, token]);

    const sendHeartbeat = async () => {
        try {
            // Prevent duplicate heartbeats within 30 seconds
            const now = Date.now();
            if (lastHeartbeatRef.current && (now - lastHeartbeatRef.current) < 30000) {
                return;
            }
            lastHeartbeatRef.current = now;

            await userAPI.heartbeat(1);
        } catch (error) {
            // Silently fail - don't interrupt user experience
            console.debug('Heartbeat failed:', error.message);
        }
    };

    // This component renders nothing - it's purely for tracking
    return null;
}
