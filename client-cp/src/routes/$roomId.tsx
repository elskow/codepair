import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import useWebRTC from "../handler/useWebRTC";
import useEditorPeer from "../handler/useEditorPeer";
import VideoStream from "../components/VideoStream";
import WriteSpace from "../components/WriteSpace";
import { Editor } from "@monaco-editor/react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
} from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../config/languages";
import TabView from "../components/TabView";
import Clock from "../components/Clock";

export const Route = createFileRoute("/$roomId")({
  component: Room,
});

function Room() {
  const { roomId } = Route.useParams();
  const { localStream, remoteStream, toggleWebcam, toggleMicrophone } =
    useWebRTC("ws://localhost:8000/api/videochat", roomId);
  const { code, language, handleEditorChange, handleLanguageChange } =
    useEditorPeer("ws://localhost:8000/api/editor", roomId);

  const [isWebcamOn, setIsWebcamOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [editorWidth, setEditorWidth] = useState<number>(50);
  const isDragging = useRef<boolean>(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const handleToggleWebcam = () => {
    toggleWebcam();
    setIsWebcamOn(!isWebcamOn);
  };

  const handleToggleMicrophone = () => {
    toggleMicrophone();
    setIsMicrophoneOn(!isMicrophoneOn);
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !mainContentRef.current) return;

    const containerRect = mainContentRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const totalWidth = containerRect.width;

    // Calculate percentage from left side
    let percentage = (mouseX / totalWidth) * 100;

    // Invert the percentage for the editor width (right side)
    percentage = 100 - percentage;

    // Clamp between 30% and 70%
    const newWidth = Math.min(Math.max(percentage, 30), 70);
    setEditorWidth(newWidth);
  };



  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setEditorWidth(100);
      } else {
        setEditorWidth(50);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#161616] text-[#f4f4f4]">
      <div className="h-screen flex flex-col md:flex-row">
        {/* Left Column - Video and TabView */}
        <div
          className="
            w-80
            md:h-screen
            bg-[#262626]
            border-r
            border-[#393939]
            flex
            flex-col
          "
        >
          <div className="p-4 border-b border-[#393939]">
            <h1 className="text-sm font-medium text-[#f4f4f4]">
              Room: {roomId}
            </h1>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Video Section */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-[#c6c6c6] font-medium">Your video</p>
                <VideoStream
                  stream={localStream}
                  muted={true}
                  title="Local video stream"
                  className="rounded-sm border border-[#393939] w-full h-32 shadow-lg bg-[#161616]"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-[#c6c6c6] font-medium">Peer video</p>
                <VideoStream
                  stream={remoteStream}
                  title="Remote video stream"
                  className="rounded-sm border border-[#393939] w-full h-32 shadow-lg bg-[#161616]"
                />
              </div>
              {/* Controls */}
              <div className="flex justify-center space-x-3 py-2">
                <button
                  onClick={handleToggleWebcam}
                  className={`
                    p-2.5
                    rounded-full
                    ${isWebcamOn ? 'bg-[#393939] hover:bg-[#4d4d4d]' : 'bg-[#da1e28] hover:bg-[#bc1a23]'}
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#0f62fe]
                    focus:ring-offset-2
                    focus:ring-offset-[#262626]
                  `}
                >
                  {isWebcamOn ? (
                    <Camera size={18} />
                  ) : (
                    <CameraOff size={18} />
                  )}
                </button>
                <button
                  onClick={handleToggleMicrophone}
                  className={`
                    p-2.5
                    rounded-full
                    ${isMicrophoneOn ? 'bg-[#393939] hover:bg-[#4d4d4d]' : 'bg-[#da1e28] hover:bg-[#bc1a23]'}
                    transition-colors
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#0f62fe]
                    focus:ring-offset-2
                    focus:ring-offset-[#262626]
                  `}
                >
                  {isMicrophoneOn ? (
                    <Mic size={18} />
                  ) : (
                    <MicOff size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Chat/Log Section */}
            <div className="flex-1 px-4 pb-4">
              <TabView />
            </div>
          </div>

          {/* Clock */}
          <div className="p-4 border-t border-[#393939] bg-[#262626]">
            <Clock />
          </div>
        </div>

        {/* Main Content Area */}
        <div
          ref={mainContentRef}
          className="flex-1 flex flex-col md:flex-row min-w-0 bg-[#262626]"
        >
          {/* Writing Space */}
          <div
            style={{ width: isMobile ? '100%' : `${100 - editorWidth}%` }}
            className={`
              relative
              min-w-[30%]
              ${isMobile ? 'h-1/2' : 'h-full'}
              border-b
              md:border-b-0
              md:border-r
              border-[#393939]
              bg-[#161616]
            `}
          >
            <WriteSpace />

            {/* Resizer */}
            {!isMobile && (
              <div
                className="absolute right-0 top-0 w-1 h-full bg-[#393939] hover:bg-[#0f62fe] cursor-col-resize transition-colors"
                onMouseDown={handleMouseDown}
                style={{ userSelect: 'none', touchAction: 'none' }}
              />
            )}
          </div>

          {/* Code Editor */}
          <div
            style={{
              width: isMobile ? '100%' : `${editorWidth}%`,
              height: isMobile ? '50%' : '100%'
            }}
            className="flex flex-col min-w-[30%] bg-[#161616]"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#393939]">
              <h2 className="text-sm font-medium text-[#f4f4f4]">Code Editor</h2>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="
                  px-3
                  py-1.5
                  text-sm
                  bg-[#262626]
                  rounded-none
                  border
                  border-[#525252]
                  hover:bg-[#353535]
                  transition-colors
                  focus:outline-none
                  focus:ring-2
                  focus:ring-[#0f62fe]
                  appearance-none
                  pr-8
                  relative
                "
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f4f4f4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em'
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 bg-[#161616]">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  automaticLayout: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  padding: { top: 16, bottom: 16 },
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}