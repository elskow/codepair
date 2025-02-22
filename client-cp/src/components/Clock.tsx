import { useState, useEffect } from "react";
import { Clock as ClockIcon } from "lucide-react"; // Import clock icon

const Clock = () => {
	const [dateTime, setDateTime] = useState(new Date());

	useEffect(() => {
		const timer = setInterval(() => {
			setDateTime(new Date());
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const formattedDate = dateTime.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	const formattedTime = dateTime.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});

	return (
		<div className="flex items-center space-x-3 text-[#c6c6c6]">
			<div className="p-2 bg-[#393939] rounded flex items-center justify-center">
				<ClockIcon size={16} className="text-[#f4f4f4]" />
			</div>
			<div>
				<div className="text-sm font-medium tracking-wide text-[#f4f4f4]">
					{formattedTime}
				</div>
				<div className="text-xs text-[#8d8d8d] mt-0.5">{formattedDate}</div>
			</div>
		</div>
	);
};

export default Clock;
