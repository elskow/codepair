import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router'
import useWebRTC from '../handler/useWebRTC';
import useEditorPeer from '../handler/useEditorPeer';
import VideoStream from '../components/VideoStream';
import { Editor } from '@monaco-editor/react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

export const Route = createFileRoute('/$roomId')({
  component: Room,
})

function Room() {
  const { roomId } = Route.useParams()
  const { localStream, remoteStream, toggleWebcam, toggleMicrophone } = useWebRTC('ws://localhost:3000', roomId);
  const { code, language, handleEditorChange, handleLanguageChange } = useEditorPeer('ws://localhost:8080', roomId);

  const [isWebcamOn, setIsWebcamOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);

  const handleToggleWebcam = () => {
    toggleWebcam();
    setIsWebcamOn(!isWebcamOn);
  };

  const handleToggleMicrophone = () => {
    toggleMicrophone();
    setIsMicrophoneOn(!isMicrophoneOn);
  };

  return (
    <header className='min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center'>
      <main className='flex flex-col items-center space-y-4'>
        <section className='flex flex-row space-x-4'>
          <VideoStream stream={localStream} muted={true} title="Local video stream" className="rounded-lg border border-neutral-700" />
          <VideoStream stream={remoteStream} title="Remote video stream" className="rounded-lg border border-neutral-700" />
        </section>
        <div className='flex space-x-4'>
          <button
            onClick={handleToggleWebcam}
            className='bg-neutral-800 text-white p-2 rounded hover:bg-neutral-700 text-sm'
            aria-label={isWebcamOn ? "Turn off webcam" : "Turn on webcam"}
            title={isWebcamOn ? "Turn off webcam" : "Turn on webcam"}
          >
            {isWebcamOn ? <Video size={20} color="white" /> : <VideoOff size={20} color="red" />}
          </button>
          <button
            onClick={handleToggleMicrophone}
            className='bg-neutral-800 text-white p-2 rounded hover:bg-neutral-700 text-sm'
            aria-label={isMicrophoneOn ? "Turn off microphone" : "Turn on microphone"}
            title={isMicrophoneOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {isMicrophoneOn ? <Mic size={20} color="white" /> : <MicOff size={20} color="red" />}
          </button>
        </div>
      </main>
      <section className='w-full px-4'>
        <div className='flex justify-end items-center mb-2 mx-8'>
          <label htmlFor="language" className='sr-only'>Select Language</label>
          <select
            id="language"
            value={language}
            onChange={handleLanguageChange}
            className='bg-neutral-800 text-white p-2 rounded hover:bg-neutral-700 text-sm'
            aria-label="Select programming language"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <Editor
          height="70vh"
          language={language}
          value={code}
          onChange={handleEditorChange}
          className="rounded-lg"
          theme='vs-dark'
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
          }}
        />
      </section>
    </header>
  )
}