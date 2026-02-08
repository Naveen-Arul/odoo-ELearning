import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiChat, HiPencil, HiUserGroup, HiArrowLeft, HiMicrophone, HiPhoneMissedCall } from 'react-icons/hi';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast'; // Import toast

import { useAuthStore } from '../store/authStore';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function StudyRoomDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('whiteboard'); // 'whiteboard' | 'chat'
    const [strokeColor, setStrokeColor] = useState('#000000');

    // Refs
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const isRemoteUpdate = useRef(false);

    // Voice Chat Refs & State
    const [isInVoice, setIsInVoice] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState([]); // { socketId, stream }
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // socketId -> RTCPeerConnection
    const isInVoiceRef = useRef(false); // Ref for socket listeners to access current state

    // Sync ref
    useEffect(() => {
        isInVoiceRef.current = isInVoice;
    }, [isInVoice]);

    const { user } = useAuthStore(); // Assuming useAuthStore exists and provides user info

    useEffect(() => {
        // Fetch room details
        fetchRoomDetails();

        // Connect Socket
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
            socketRef.current.emit('join-room', id);
        });

        // Listen for incoming messages
        socketRef.current.on('new-message', (messageData) => {
            setMessages((prev) => [...prev, messageData]);
        });

        // Listen for whiteboard updates
        // Listen for whiteboard updates
        socketRef.current.on('draw-data', async (incomingData) => {
            if (canvasRef.current && activeTab === 'whiteboard') {
                if (incomingData) {
                    isRemoteUpdate.current = true;
                    try {
                        // Clear existing canvas to prevent duplication before loading new state
                        canvasRef.current.clearCanvas();
                        await canvasRef.current.loadPaths(incomingData);
                    } catch (error) {
                        console.error('Error syncing whiteboard:', error);
                    } finally {
                        // Small delay to ensure local onChange events from loadPaths are ignored
                        setTimeout(() => {
                            isRemoteUpdate.current = false;
                        }, 200);
                    }
                }
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-room', id);
                socketRef.current.disconnect();
            }
        };
    }, [id]);

    // Handle Voice Chat Socket Events
    useEffect(() => {
        if (!socketRef.current) return;

        const socket = socketRef.current;

        const handleUserJoinedVoice = ({ socketId }) => {
            if (isInVoiceRef.current) {
                console.log('User joined voice, initiating call to', socketId);
                createPeer(socketId, true);
            }
        };

        const handleOffer = ({ sdp, caller }) => {
            if (isInVoiceRef.current) {
                console.log('Received offer from', caller);
                createPeer(caller, false, sdp);
            }
        };

        const handleAnswer = ({ sdp, caller }) => {
            const pc = peersRef.current[caller];
            if (pc) {
                pc.setRemoteDescription(new RTCSessionDescription(sdp))
                    .catch(e => console.error('Error setting remote description', e));
            }
        };

        const handleIceCandidate = ({ candidate, caller }) => {
            const pc = peersRef.current[caller];
            if (pc) {
                pc.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error('Error adding ice candidate', e));
            }
        };

        const handleUserLeftVoice = (socketId) => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
                setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
            }
        };

        socket.on('user-joined-voice', handleUserJoinedVoice);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-left-voice', handleUserLeftVoice);

        return () => {
            socket.off('user-joined-voice', handleUserJoinedVoice);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user-left-voice', handleUserLeftVoice);
        };
    }, []); // Only bind once, use refs for state access

    const handleLeaveRoom = async () => {
        if (!room) return;
        try {
            const token = localStorage.getItem('token');
            // If in voice, leave voice first
            if (isInVoice) {
                handleLeaveVoice();
            }

            // Call backend to leave
            await fetch(`${API_URL}/social/rooms/${room._id}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            navigate('/study-rooms');
        } catch (error) {
            console.error('Error leaving room:', error);
            navigate('/study-rooms');
        }
    };

    const createPeer = (targetSocketId, initiator, incomingSdp = null) => {
        const iceServers = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        };
        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    target: targetSocketId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('Received remote stream from', targetSocketId);
            setRemoteStreams(prev => {
                if (prev.find(s => s.socketId === targetSocketId)) return prev;
                return [...prev, { socketId: targetSocketId, stream: event.streams[0] }];
            });
        };

        peersRef.current[targetSocketId] = pc;

        if (initiator) {
            pc.createOffer()
                .then(offer => {
                    pc.setLocalDescription(offer);
                    socketRef.current.emit('offer', { target: targetSocketId, sdp: offer });
                })
                .catch(err => console.error('Error creating offer', err));
        } else {
            pc.setRemoteDescription(new RTCSessionDescription(incomingSdp))
                .then(() => pc.createAnswer())
                .then(answer => {
                    pc.setLocalDescription(answer);
                    socketRef.current.emit('answer', { target: targetSocketId, sdp: answer });
                })
                .catch(err => console.error('Error handling offer', err));
        }
    };

    const handleJoinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setIsInVoice(true);

            if (socketRef.current) {
                socketRef.current.emit('join-voice', { roomId: id, user });
            }
            toast.success('Joined voice chat');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            toast.error('Could not access microphone');
        }
    };

    const handleLeaveVoice = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Close all peers
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
        setRemoteStreams([]);
        setIsInVoice(false);

        if (socketRef.current) {
            socketRef.current.emit('leave-voice', { roomId: id });
        }
        toast.success('Left voice chat');
    };

    const handleCanvasChange = async () => {
        // If this change was triggered by a remote update, do not emit it back
        if (isRemoteUpdate.current) return;

        if (socketRef.current && canvasRef.current) {
            const data = await canvasRef.current.exportPaths();
            socketRef.current.emit('draw-data', { roomId: id, data });
        }
    }

    const fetchRoomDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/rooms/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setRoom(data.data);
                // Also load previous messages if any
                if (data.data.messages) {
                    setMessages(data.data.messages);
                }
            } else {
                toast.error('Failed to load room details');
                navigate('/study-rooms');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading room');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Emit through socket instead of REST API for real-time
        if (socketRef.current) {
            socketRef.current.emit('send-message', {
                roomId: id,
                message: newMessage,
                user: user?.name || 'Anonymous'
            });
            // Optimistic update (optional, but socket broadcast handles it)
            // setMessages([...messages, { content: newMessage, user: 'Me' }]);
            setNewMessage('');
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button onClick={handleLeaveRoom} className="p-2 hover:bg-dark-800 rounded-lg">
                        <HiArrowLeft className="w-5 h-5 text-dark-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Study Room</h1>
                        {room?.roomId && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-dark-400">ID:</span>
                                <code className="px-2 py-0.5 rounded bg-dark-800 text-primary-400 text-xs font-mono select-all cursor-pointer hover:bg-dark-700" onClick={() => { navigator.clipboard.writeText(room.roomId); toast.success('ID Copied!'); }}>
                                    {room.roomId}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Voice Chat Controls */}
                    {isInVoice ? (
                        <button
                            onClick={handleLeaveVoice}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                            <HiPhoneMissedCall className="w-5 h-5" />
                            Leave
                        </button>
                    ) : (
                        <button
                            onClick={handleJoinVoice}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <HiMicrophone className="w-5 h-5" />
                            Join Voice
                        </button>
                    )}
                    <div className="h-6 w-px bg-dark-600 mx-1"></div>
                    <button
                        onClick={() => setActiveTab('whiteboard')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'whiteboard' ? 'bg-primary text-primary-foreground' : 'bg-dark-800 text-dark-300'}`}
                    >
                        <HiPencil className="w-5 h-5 inline mr-2" />
                        Whiteboard
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'chat' ? 'bg-primary text-primary-foreground' : 'bg-dark-800 text-dark-300'}`}
                    >
                        <HiChat className="w-5 h-5 inline mr-2" />
                        Chat
                    </button>

                    {/* Hidden Audio Elements for Remote Streams */}
                    {remoteStreams.map((item) => (
                        <AudioPlayer key={item.socketId} stream={item.stream} />
                    ))}
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Whiteboard Area */}
                <div className={`flex-1 card p-0 bg-white overflow-hidden relative ${activeTab === 'whiteboard' ? 'block' : 'hidden md:block'}`}>
                    <div className="absolute top-4 left-4 z-10 p-2 bg-dark-800/80 rounded-lg backdrop-blur flex gap-2 shadow-xl">
                        {['#000000', '#FF0000', '#00FF00', '#0000FF'].map(color => (
                            <button
                                key={color}
                                className={`w-8 h-8 rounded-full border-2 ${strokeColor === color ? 'border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    setStrokeColor(color);
                                    canvasRef.current?.eraseMode(false);
                                }}
                            />
                        ))}
                        <button
                            className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs font-bold text-black"
                            onClick={() => canvasRef.current?.eraseMode(true)}
                        >
                            Erase
                        </button>
                        <button
                            className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs font-bold text-black"
                            onClick={() => canvasRef.current?.clearCanvas()}
                        >
                            Clear
                        </button>
                    </div>
                    <ReactSketchCanvas
                        ref={canvasRef}
                        strokeWidth={4}
                        strokeColor={strokeColor}
                        canvasColor="white"
                        onChange={handleCanvasChange} // Capture strokes
                    />
                </div>

                {/* Chat Area (Right Sidebar) */}
                <div className={`w-full md:w-80 card p-0 flex flex-col ${activeTab === 'chat' ? 'block' : 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-dark-700 font-semibold text-white">
                        Room Chat
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && <p className="text-center text-dark-500 mt-10">No messages yet.</p>}
                        {messages.map((msg, i) => (
                            <div key={i} className="bg-dark-800 p-2 rounded-lg">
                                <p className="text-xs text-primary-400 font-bold mb-1">
                                    {msg.user?.name || msg.user || 'User'}
                                </p>
                                <p className="text-sm text-white">{msg.content}</p>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-700">
                        <input
                            className="input w-full text-sm"
                            placeholder="Type..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}

const AudioPlayer = ({ stream }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay controls={false} />;
};
