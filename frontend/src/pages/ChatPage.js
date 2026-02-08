import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPaperAirplane, HiSearch, HiUserGroup, HiChat, HiUserAdd, HiCheck, HiX, HiClock, HiInbox } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function ChatPage() {
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sidebarView, setSidebarView] = useState('chats'); // 'chats' | 'discover'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [requests, setRequests] = useState([]);
    const messagesEndRef = useRef(null);

    const socketRef = useRef(null);

    useEffect(() => {
        fetchConversations();
        fetchRequests();

        // Connect Socket
        socketRef.current = io(SOCKET_URL);

        if (user?._id) {
            socketRef.current.emit('register-user', user._id);
        }

        socketRef.current.on('new_friend_request', (data) => {
            toast.success(`New friend request from ${data.follower.name}`);
            setRequests(prev => [data, ...prev]);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [user?._id]);

    // Search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat._id);
            // Polling for new messages (simple implementation)
            const interval = setInterval(() => fetchMessages(activeChat._id), 5000);
            return () => clearInterval(interval);
        }
    }, [activeChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/following`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setConversations(data.data);
            }
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/connect/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (error) {
            console.error('Failed to load requests', error);
        }
    };

    const handleSearch = async (query) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/users/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            }
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/connect/request/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Request sent!');
                handleSearch(searchQuery); // Refresh status
            } else {
                toast.error(data.message || 'Failed to send request');
            }
        } catch (error) {
            toast.error('Error sending request');
        }
    };

    const handleAcceptRequest = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/connect/accept/${requestId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Friend request accepted!');
                fetchRequests();
                fetchConversations();
            }
        } catch (error) {
            toast.error('Error accepting request');
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/social/connect/reject/${requestId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Request removed');
            fetchRequests();
        } catch (error) {
            toast.error('Error rejecting request');
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/messages/conversation/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMessages(data.data);
            }
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/messages/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientId: activeChat._id,
                    content: newMessage
                })
            });
            const data = await response.json();

            if (data.success) {
                setMessages([...messages, data.data]);
                setNewMessage('');
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex gap-0 -m-4 lg:-m-6">
            {/* Sidebar - Conversations */}
            <div className="w-96 flex-shrink-0 card p-0 overflow-hidden flex flex-col rounded-none border-r border-dark-700">
                <div className="p-4 border-b border-dark-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Social</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSidebarView('chats')}
                                className={`p-2 rounded-lg ${sidebarView === 'chats' ? 'bg-primary text-primary-foreground' : 'text-dark-400 hover:bg-dark-800'}`}
                                title="Chats"
                            >
                                <HiChat className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setSidebarView('requests')}
                                className={`p-2 rounded-lg relative ${sidebarView === 'requests' ? 'bg-primary text-primary-foreground' : 'text-dark-400 hover:bg-dark-800'}`}
                                title="Requests"
                            >
                                <HiInbox className="w-5 h-5" />
                                {requests.length > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-dark-900" />
                                )}
                            </button>
                            <button
                                onClick={() => setSidebarView('discover')}
                                className={`p-2 rounded-lg ${sidebarView === 'discover' ? 'bg-primary text-primary-foreground' : 'text-dark-400 hover:bg-dark-800'}`}
                                title="Discover People"
                            >
                                <HiUserAdd className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                        <input
                            type="text"
                            placeholder={sidebarView === 'chats' ? "Search chats..." : sidebarView === 'discover' ? "Find people..." : "Search requests..."}
                            className="input pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {sidebarView === 'chats' ? (
                        /* CHATS LIST */
                        loading ? (
                            <div className="p-4 text-center text-dark-400">Loading...</div>
                        ) : (
                            <div className="space-y-1">
                                {conversations.length === 0 && !searchQuery ? (
                                    <div className="p-4 text-center text-dark-400">
                                        <HiUserGroup className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No friends yet. Go to Discover to find people!</p>
                                    </div>
                                ) : (
                                    conversations
                                        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(contact => (
                                            <button
                                                key={contact._id}
                                                onClick={() => setActiveChat(contact)}
                                                className={`w-full p-3 flex items-center gap-3 rounded-lg transition-colors ${activeChat?._id === contact._id
                                                    ? 'bg-primary-500/20 text-white'
                                                    : 'hover:bg-dark-700 text-dark-300'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                                                    {contact.name?.charAt(0)}
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <h3 className="font-medium truncate">{contact.name}</h3>
                                                </div>
                                            </button>
                                        ))
                                )}

                                {searchQuery && (
                                    <div className="pt-2 mt-2 border-t border-dark-700">
                                        <h3 className="px-2 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">More People</h3>
                                        {searchResults
                                            .filter(u => u.connectionStatus !== 'accepted')
                                            .map(user => (
                                                <div key={user._id} className="p-3 flex items-center justify-between hover:bg-dark-800 rounded-lg">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white font-bold text-xs">
                                                            {user.name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-medium text-white truncate">{user.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {user.connectionStatus === 'pending' ? (
                                                            <span className="text-yellow-500 text-xs flex items-center gap-1"><HiClock /> Sent</span>
                                                        ) : user.connectionStatus === 'received' ? (
                                                            <button
                                                                onClick={() => handleAcceptRequest(user.requestId)}
                                                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                                            >
                                                                Accept
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSendRequest(user._id)}
                                                                className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-md"
                                                                title="Add Friend"
                                                            >
                                                                <HiUserAdd className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )
                    ) : sidebarView === 'requests' ? (
                        /* REQUESTS INBOX */
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <div className="p-4 text-center text-dark-400">
                                    <HiInbox className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No pending requests</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="px-2 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Incoming Requests</h3>
                                    {requests
                                        .filter(req => req.follower?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(req => (
                                            <div key={req._id} className="p-3 bg-dark-800 rounded-lg mb-2 border border-dark-700">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                                        {req.follower?.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-white truncate">{req.follower?.name}</h4>
                                                        <p className="text-[10px] text-dark-500 mt-0.5">
                                                            Sent {new Date(req.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(req._id)}
                                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(req._id)}
                                                        className="flex-1 py-1.5 bg-dark-600 hover:bg-dark-500 text-white rounded text-sm font-medium transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* DISCOVER LIST */
                        <div className="space-y-4">
                            <div>
                                <h3 className="px-2 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Search Results</h3>
                                {searchResults.length === 0 && searchQuery && (
                                    <p className="text-center text-dark-500 text-sm">No users found</p>
                                )}
                                {!searchQuery && searchResults.length === 0 && (
                                    <div className="p-4 text-center text-dark-400">
                                        <HiSearch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Search to find new people</p>
                                    </div>
                                )}
                                {searchResults.map(user => (
                                    <div key={user._id} className="p-3 flex items-center justify-between hover:bg-dark-800 rounded-lg">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-white font-bold text-xs">
                                                {user.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-medium text-white truncate">{user.name}</h4>
                                            </div>
                                        </div>
                                        <div>
                                            {user.connectionStatus === 'accepted' ? (
                                                <span className="text-green-500 text-xs flex items-center gap-1"><HiCheck /> Friend</span>
                                            ) : user.connectionStatus === 'pending' ? (
                                                <span className="text-yellow-500 text-xs flex items-center gap-1"><HiClock /> Sent</span>
                                            ) : user.connectionStatus === 'received' ? (
                                                <button
                                                    onClick={() => handleAcceptRequest(user.requestId)}
                                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                                >
                                                    Accept
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSendRequest(user._id)}
                                                    className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-md"
                                                    title="Add Friend"
                                                >
                                                    <HiUserAdd className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 card p-0 flex flex-col overflow-hidden rounded-none">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-dark-700 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                                {activeChat.name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-white font-semibold">{activeChat.name}</h2>
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Online
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender === user?._id || msg.sender?._id === user?._id;
                                return (
                                    <div
                                        key={idx}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-2xl ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-muted text-foreground rounded-tl-none'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <span className={`text-[10px] mt-1 block ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                                }`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="p-4 border-t border-dark-700 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="input flex-1"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="btn-primary p-3 rounded-lg flex items-center justify-center"
                            >
                                <HiPaperAirplane className="w-5 h-5 rotate-90" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
                        <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mb-4">
                            <HiChat className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                        <p>Choose a contact from the sidebar to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
