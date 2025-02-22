interface RoomSearchProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
}

export function RoomSearch({ searchQuery, setSearchQuery }: RoomSearchProps) {
	return (
		<div className="w-full">
			<label htmlFor="search-rooms" className="sr-only">
				Search rooms
			</label>
			<input
				id="search-rooms"
				type="text"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Search rooms"
				className="w-full lg:w-[400px] h-10 pl-4 pr-10 bg-[#262626] text-[#f4f4f4] border border-[#393939] focus:outline-none focus:border-[#ffffff] text-sm placeholder-[#525252]"
			/>
		</div>
	);
}
