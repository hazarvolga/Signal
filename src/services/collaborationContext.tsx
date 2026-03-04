import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

interface CollaborationContextType {
  socket: any;
  activeUsers: any[];
  cursors: Record<string, any>;
  activities: Record<string, string>;
  activityLog: any[];
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendCursorMove: (roomId: string, position: { x: number; y: number }) => void;
  sendActivity: (roomId: string, activity: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, any>>({});
  const [activities, setActivities] = useState<Record<string, string>>({});
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('room-users', (users: any[]) => {
      setActiveUsers(users);
    });

    newSocket.on('user-cursor-move', ({ socketId, position, user }: any) => {
      setCursors(prev => ({ ...prev, [socketId]: { position, user } }));
    });

    newSocket.on('user-activity', ({ socketId, activity, user }: any) => {
      setActivities(prev => ({ ...prev, [socketId]: activity }));
      setActivityLog(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        user,
        activity,
        timestamp: new Date()
      }, ...prev].slice(0, 50));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (socket && user) {
      socket.emit('join-room', { roomId, user: { id: user.id, name: user.name, role: user.role } });
    }
  }, [socket, user]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('leave-room', { roomId });
      setActiveUsers([]);
      setCursors({});
      setActivities({});
    }
  }, [socket]);

  const sendCursorMove = useCallback((roomId: string, position: { x: number; y: number }) => {
    if (socket) {
      socket.emit('cursor-move', { roomId, position });
    }
  }, [socket]);

  const sendActivity = useCallback((roomId: string, activity: string) => {
    if (socket) {
      socket.emit('activity', { roomId, activity });
    }
  }, [socket]);

  return (
    <CollaborationContext.Provider value={{ 
      socket, 
      activeUsers, 
      cursors, 
      activities,
      activityLog,
      joinRoom, 
      leaveRoom, 
      sendCursorMove, 
      sendActivity 
    }}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};
