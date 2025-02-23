const Log = () => {
	const logs = [
		{ id: 1, time: "10:00", message: "User John joined the room" },
		{ id: 2, time: "10:01", message: "User Jane joined the room" },
		{ id: 3, time: "10:02", message: "John enabled camera" },
	];

	return (
		<div className="h-full">
			<div className="overflow-y-auto p-2 space-y-1">
				{logs.map((log) => (
					<div key={log.id} className="text-xs text-neutral-400">
						<span className="text-neutral-500">[{log.time}]</span> {log.message}
					</div>
				))}
			</div>
		</div>
	);
};

export default Log;
