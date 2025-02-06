import React, { useState } from 'react';

const Chat = () => {
    const [messages, setMessages] = useState([
        { id: 1, user: 'John', text: 'Hello there!' },
        { id: 2, user: 'Jane', text: 'Hi! How are you?' },
    ]);
    const [newMessage, setNewMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            setMessages([...messages, { id: Date.now(), user: 'You', text: newMessage }]);
            setNewMessage('');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                        <span className="font-semibold">{msg.user}:</span> {msg.text}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="p-2 border-t border-neutral-700">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full bg-neutral-700 text-white p-2 rounded text-sm"
                    placeholder="Type a message..."
                />
            </form>
        </div>
    );
};

export default Chat;
