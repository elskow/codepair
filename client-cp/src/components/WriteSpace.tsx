import { useState } from 'react';

const WriteSpace = () => {
    const [content, setContent] = useState('');

    return (
        <div className="h-full flex flex-col bg-[#161616]">
            <div className="p-4 border-b border-[#393939] flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#f4f4f4]">Notes</h2>
            </div>
            <div className="flex-1 p-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full bg-transparent text-[#f4f4f4] resize-none focus:outline-none text-sm font-[IBM Plex Sans]"
                    placeholder="Write your notes here..."
                />
            </div>
        </div>
    );
};

export default WriteSpace;