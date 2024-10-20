import { useState, useEffect, useCallback, useRef } from "react";

const useEditorPeer = (url: string, roomId: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [code, setCode] = useState("// Start coding...");
  const [language, setLanguage] = useState("javascript");
  const prevCodeRef = useRef(code);

  useEffect(() => {
    const socket = new WebSocket(`${url}/${roomId}`);
    setWs(socket);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "code") {
        setCode(message.code);
        setLanguage(message.language);
      }

      if (message.type === "sync") {
        setCode(message.code);
        setLanguage(message.language);
      }
    };

    return () => {
      socket.close();
    };
  }, [url, roomId]);

  const sendUpdate = useCallback(
    (newCode: string, newLanguage: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "code",
            code: newCode,
            language: newLanguage,
            roomId: roomId,
          }),
        );
      }
    },
    [ws, roomId],
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
        if (value !== prevCodeRef.current) {
          sendUpdate(value, language);
          prevCodeRef.current = value;
        }
      }
    },
    [language, sendUpdate],
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newLanguage = event.target.value;
      setLanguage(newLanguage);
      sendUpdate(code, newLanguage);
    },
    [code, sendUpdate],
  );

  return { code, language, handleEditorChange, handleLanguageChange };
};

export default useEditorPeer;
