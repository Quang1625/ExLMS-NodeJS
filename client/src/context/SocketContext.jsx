import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext({ socket: null, unreadCount: 0, setUnreadCount: () => {} });

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) {
            if (socket) socket.close();
            return;
        }

        const newSocket = io({
            path: '/socket.io'
        });

        newSocket.on('connect', () => {
            console.log('socket connected');
            newSocket.emit('join_user_room', user._id);
            
            // fetch user's groups and join their socket rooms
            api.get('/study-groups').then(res => {
                const groups = res.data.data || res.data;
                groups.forEach(g => {
                    const isMember = g.members?.some(m => (m.user_id === user._id || m.user_id?._id === user._id) && m.status === 'ACTIVE');
                    const isOwner = g.owner_id === user._id || g.owner_id?._id === user._id;
                    if (isMember || isOwner) {
                        newSocket.emit('join_group', g._id);
                    }
                });
            }).catch(err => console.error('Error fetching groups for sockets:', err));

            // fetch initial unread notifications count
            api.get('/notifications').then(res => {
                const notifs = res.data.data || res.data || [];
                const unread = notifs.filter(n => !n.is_read).length;
                setUnreadCount(unread);
            }).catch(() => {});
        });

        newSocket.on('NEW_ASSIGNMENT', (data) => {
            setUnreadCount(prev => prev + 1);
            window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));
        });

        newSocket.on('NEW_MEETING', (data) => {
            setUnreadCount(prev => prev + 1);
            window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));
        });

        setSocket(newSocket);

        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, unreadCount, setUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
