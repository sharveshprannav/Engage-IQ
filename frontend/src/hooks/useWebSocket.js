import { useEffect, useRef } from 'react';
import { useFeedbackStore } from '../store/feedbackStore';
import { useUIStore } from '../store/uiStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useWebSocket() {
  const wsRef = useRef(null);
  const addLiveFeedback = useFeedbackStore((s) => s.addLiveFeedback);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    let reconnectTimer = null;

    const connect = () => {
      try {
        const socket = new WebSocket(`${WS_URL}/ws/feedback-stream`);

        socket.onopen = () => {
          console.log('[EngageAI WS] Connected to live feedback stream');
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'new_feedback') {
              addLiveFeedback(payload.data);
              addToast(`New ${payload.data.priority.toUpperCase()} priority feedback received`, 'info');
            } else if (payload.type === 'new_notification') {
              addToast(`Alert: ${payload.data.title}`, 'warning');
            }
          } catch (e) {
            console.error('[EngageAI WS] Message parse error:', e);
          }
        };

        socket.onclose = () => {
          console.log('[EngageAI WS] Disconnected. Reconnecting in 3s...');
          reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.error('[EngageAI WS] Error:', err);
          socket.close();
        };

        wsRef.current = socket;
      } catch (err) {
        console.error('[EngageAI WS] Connection failed:', err);
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [addLiveFeedback, addToast]);
}
