import React, { useState } from 'react';
import { Editor } from '@monaco-editor/react';
import VideoStream from './components/VideoStream';
import useWebRTC from './handler/useWebRTC';
import './App.css';

const App: React.FC = () => {
    const [code, setCode] = useState('// Start coding...');
    const [language, setLanguage] = useState('javascript');

    const {
        connectionStatus,
        localStream,
        remoteStream,
    } = useWebRTC();

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(value);
        }
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(event.target.value);
    };

    return (
        <header className='min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center'>
            <main className='flex flex-col items-center space-y-4'>
                <section className='flex flex-row space-x-4'>
                    <VideoStream stream={localStream} muted={true} title="Local video stream" className="rounded-lg border border-neutral-700" />
                    <VideoStream stream={remoteStream} title="Remote video stream" className="rounded-lg border border-neutral-700" />
                </section>
                <div className="text-center text-sm">Connection Status: {connectionStatus}</div>
            </main>
            <section className='w-full px-4'>
                <div className='flex justify-end items-center mb-2 mx-8'>
                    <label htmlFor="language" className='sr-only'>Select Language</label>
                    <select id="language" value={language} onChange={handleLanguageChange} className='bg-neutral-800 text-white p-2 rounded hover:bg-neutral-700 text-sm'>
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
    );
};

export default App;