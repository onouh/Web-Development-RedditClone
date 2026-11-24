import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';
import { useToast } from './ToastContext.jsx';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket, online } = useSocket();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const [typing, setTyping] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(false);

  const conversationsRef = useRef([]);
  const messagesRef = useRef({});
  const activeRef = useRef(null);
  const openRef = useRef(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const data = await api('/chat');
      setConversations(data.items);
    } catch (error) {
      if (error.status !== 401) console.warn('Could not load conversations', error.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshConversations();
    else {
      setConversations([]);
      setMessages({});
      setActiveId(null);
      setOpen(false);
    }
  }, [user, refreshConversations]);

  const markReadLocal = useCallback((id) => {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation)),
    );
  }, []);

  const openConversation = useCallback(
    async (id) => {
      if (!id) return;
      setActiveId(id);
      setOpen(true);
      markReadLocal(id);
      socket?.emit('conversation:join', { conversationId: id });

      if (!messagesRef.current[id]) {
        try {
          const data = await api(`/chat/${id}/messages`);
          setMessages((current) => ({ ...current, [id]: data.items }));
        } catch (error) {
          toast.error(error.message);
        }
      }
      api(`/chat/${id}/read`, { method: 'POST' }).catch(() => {});
    },
    [socket, markReadLocal, toast],
  );

  const startConversation = useCallback(
    async (participantId) => {
      try {
        const data = await api('/chat', { method: 'POST', body: { participantIds: [participantId] } });
        const conversation = data.conversation;
        setConversations((current) =>
          current.some((item) => item.id === conversation.id) ? current : [conversation, ...current],
        );
        await openConversation(conversation.id);
        return conversation;
      } catch (error) {
        toast.error(error.message);
        return null;
      }
    },
    [openConversation, toast],
  );

  const removeTemp = useCallback((conversationId, tempId) => {
    setMessages((current) => ({
      ...current,
      [conversationId]: (current[conversationId] || []).filter((message) => message.tempId !== tempId),
    }));
  }, []);

  const sendMessage = useCallback(
    async (content) => {
      const conversationId = activeRef.current;
      const text = String(content || '').trim();
      if (!conversationId || !text) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        tempId,
        conversationId,
        content: text,
        createdAt: new Date().toISOString(),
        sender: user,
      };
      setMessages((current) => ({
        ...current,
        [conversationId]: [...(current[conversationId] || []), optimistic],
      }));

      if (socket?.connected) {
        socket.emit('message:send', { conversationId, content: text, tempId }, (ack) => {
          if (!ack?.ok) {
            removeTemp(conversationId, tempId);
            toast.error(ack?.error || 'Message failed to send');
          }
        });
        return;
      }

      try {
        const data = await api(`/chat/${conversationId}/messages`, { method: 'POST', body: { content: text } });
        setMessages((current) => ({
          ...current,
          [conversationId]: (current[conversationId] || [])
            .filter((message) => message.tempId !== tempId)
            .concat(data.message),
        }));
      } catch (error) {
        removeTemp(conversationId, tempId);
        toast.error(error.message);
      }
    },
    [socket, user, removeTemp, toast],
  );

  const notifyTyping = useCallback(() => {
    if (!activeRef.current || !socket) return;
    socket.emit('typing:start', { conversationId: activeRef.current });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeRef.current });
    }, 1500);
  }, [socket]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  useEffect(() => {
    if (!socket || !user) return undefined;

    const onMessage = ({ conversationId, message, tempId }) => {
      setMessages((current) => {
        const existing = current[conversationId] || [];
        const withoutTemp = tempId ? existing.filter((item) => item.tempId !== tempId) : existing;
        if (withoutTemp.some((item) => item.id === message.id)) return current;
        return { ...current, [conversationId]: [...withoutTemp, message] };
      });

      const isMine = message.sender?.id === user.id;
      const isActive = activeRef.current === conversationId && openRef.current;
      const known = conversationsRef.current.some((item) => item.id === conversationId);
      if (!known) refreshConversations();

      setConversations((current) =>
        current
          .map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            return {
              ...conversation,
              lastMessage: message.content,
              updatedAt: message.createdAt,
              unreadCount: isMine || isActive ? 0 : (conversation.unreadCount || 0) + 1,
            };
          })
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      );

      if (!isMine && isActive) {
        api(`/chat/${conversationId}/read`, { method: 'POST' }).catch(() => {});
      }
    };

    const onTyping = ({ conversationId, userId, displayName, isTyping }) => {
      if (userId === user.id) return;
      setTyping((current) => {
        const room = { ...(current[conversationId] || {}) };
        if (isTyping) room[userId] = displayName;
        else delete room[userId];
        return { ...current, [conversationId]: room };
      });
    };

    socket.on('message:new', onMessage);
    socket.on('typing:update', onTyping);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:update', onTyping);
    };
  }, [socket, user, refreshConversations]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId) || null;
  const activeMessages = activeId ? messages[activeId] || [] : [];
  const typingUsers = activeId ? Object.values(typing[activeId] || {}) : [];
  const unreadTotal = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);

  const value = useMemo(
    () => ({
      conversations,
      activeId,
      activeConversation,
      messages: activeMessages,
      typingUsers,
      online,
      unreadTotal,
      open,
      loadingConversations,
      setOpen,
      openConversation,
      startConversation,
      sendMessage,
      notifyTyping,
      refreshConversations,
      closeDrawer: () => setOpen(false),
      clearActive: () => setActiveId(null),
    }),
    [
      conversations,
      activeId,
      activeConversation,
      activeMessages,
      typingUsers,
      online,
      unreadTotal,
      open,
      loadingConversations,
      openConversation,
      startConversation,
      sendMessage,
      notifyTyping,
      refreshConversations,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used inside ChatProvider');
  return context;
};
