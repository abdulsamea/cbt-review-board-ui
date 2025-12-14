import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { SessionStatus } from '../types/session';

interface UseSessionStreamReturn {
    sessionStatus: SessionStatus | null;
    setSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>;
    isLoading: boolean;
    error: string | null;
    restartStream: () => void;
}

const API_BASE_URL = 'http://localhost:8000';

export const useSessionStream = (threadId: string | null): UseSessionStreamReturn => {
    const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [streamKey, setStreamKey] = useState(0);

    useEffect(() => {
        if (!threadId) {
            setSessionStatus(null);
            setIsLoading(false);
            return;
        }

        setError(null);
        setIsLoading(true);

        const url = `${API_BASE_URL}/stream_session_info?thread_id=${threadId}`;
        let eventSource: EventSource | null = null;

        try {
            eventSource = new EventSource(url);
            console.log(`SSE connection opened for thread: ${threadId} (key: ${streamKey})`);
        } catch (e) {
            console.error("Failed to create EventSource:", e);
            setError("Cannot establish connection to the streaming server.");
            setIsLoading(false);
            return;
        }

        eventSource.onopen = () => {
            console.log(`SSE connection opened for thread: ${threadId}`);
            // The first message will set isLoading to false
        };

        eventSource.onmessage = (event) => {
            setIsLoading(false);
            try {
                const data: SessionStatus = JSON.parse(event.data);
                
                // Update status
                setSessionStatus(data);
                
                // If the backend sends a terminal status AND thread is dead, close gracefully.
                // The backend now determines the end state reliably.
                if (data.status === 'complete' && !data.thread_alive) {
                    eventSource?.close();
                    console.log(`SSE connection closed due to 'complete' status.`);
                } else if (data.status === 'halted' && !data.thread_alive && data.active_node !== 'HIL_Node') {
                    // Unexpected halt
                    eventSource?.close();
                    console.log(`SSE connection closed due to unexpected halt.`);
                }
                
            } catch (e) {
                console.error("Error parsing SSE message:", e);
                setError("Received malformed data from the server stream.");
                // Do not close eventSource immediately on parse error, let it try again
            }
        };

        eventSource.onerror = (e) => {
            console.error("SSE connection error:", e);
            eventSource?.close();
            // Only set a general error if no terminal status has been received
            if (sessionStatus?.status !== 'complete') {
                 setError("Connection to the session stream was lost.");
            }
            setIsLoading(false);
        };

        // Cleanup function: ALWAYS closes the connection when the component unmounts or threadId/streamKey changes
        return () => {
            if (eventSource) {
                eventSource.close();
                console.log('SSE connection closed by cleanup.');
            }
        };
    }, [threadId, streamKey]); // Dependency array: restart stream when threadId or streamKey changes

    // Function to restart the stream connection
    const restartStream = () => {
        if (threadId) {
            console.log('Restarting SSE stream for thread:', threadId);
            setStreamKey(prev => prev + 1); // Increment key to trigger useEffect
        }
    };

    return { sessionStatus, setSessionStatus, isLoading, error, restartStream };
};