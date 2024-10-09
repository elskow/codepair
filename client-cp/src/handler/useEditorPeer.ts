import { useState, useEffect, useCallback } from 'react';

const useEditorPeer = (url: string, roomId: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [code, setCode] = useState('// Start coding...');
  const [language, setLanguage] = useState('javascript');

  useEffect(() => {
    const socket = new WebSocket(`${url}/ws/${roomId}`);
    setWs(socket);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'code') {
        setCode(message.code);
        setLanguage(message.language);
      }
    };

    return () => {
      socket.close();
    };
  }, [url, roomId]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'code',
          code: value,
          language: language,
          roomId: roomId
        }));
      }
    }
  }, [ws, language, roomId]);

  const handleLanguageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'code',
        code: code,
        language: newLanguage,
        roomId: roomId
      }));
    }
  }, [ws, code, roomId]);

  return { code, language, handleEditorChange, handleLanguageChange };
};

export default useEditorPeer;