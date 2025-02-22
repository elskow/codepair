import type React from "react";
import { useEffect, useRef } from "react";

interface VideoStreamProps {
	stream: MediaStream | null;
	muted?: boolean;
	title?: string;
	className?: string;
}

const VideoStream: React.FC<VideoStreamProps> = ({
	stream,
	muted = false,
	title = "",
	className = "",
}) => {
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
			className={`w-48 h-32 bg-neutral-800 ${className}`}
		/>
	);
};

export default VideoStream;
