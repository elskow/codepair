import { useState } from 'react';
import Chat from './Chat';
import Log from './Log';

const TabView = () => {
    const [activeTab, setActiveTab] = useState<'chat' | 'log'>('chat');

    return (
        <div className="flex flex-col h-full bg-[#262626] rounded-lg overflow-hidden">
            <div className="flex border-b border-[#393939]">
                <button
                    className={`
            flex-1 px-4 py-2 text-sm font-medium
            ${activeTab === 'chat'
                            ? 'bg-[#393939] text-white'
                            : 'text-[#8d8d8d] hover:text-white hover:bg-[#353535]'
                        }
            transition-colors
          `}
                    onClick={() => setActiveTab('chat')}
                >
                    Chat
                </button>
                <button
                    className={`
            flex-1 px-4 py-2 text-sm font-medium
            ${activeTab === 'log'
                            ? 'bg-[#393939] text-white'
                            : 'text-[#8d8d8d] hover:text-white hover:bg-[#353535]'
                        }
            transition-colors
          `}
                    onClick={() => setActiveTab('log')}
                >
                    Log
                </button>
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' ? <Chat /> : <Log />}
            </div>
        </div>
    );
};

export default TabView;
