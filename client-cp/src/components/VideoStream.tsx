import React, { useEffect, useRef } from 'react';

interface VideoStreamProps {
    stream: MediaStream | null;
    muted?: boolean;
    title?: string;
}

const VideoStream: React.FC<VideoStreamProps> = ({ stream, muted = false, title = '' }) => {
    const videoElement = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoElement.current) {
            videoElement.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoElement}
            muted={muted}
            autoPlay
            playsInline
            title={title}
            style={{
                width: '300px',
                height: '200px',
                margin: '10px',
                backgroundColor: '#ddd',
            }}
        ></video>
    );
};

export default VideoStream;