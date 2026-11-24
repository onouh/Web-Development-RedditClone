import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { timeAgo } from '../lib/format.js';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ConversationList({ onSelect, className = '' }) {
  const { conversations, activeId, online, loadingConversations } = useChat();

  if (loadingConversations && !conversations.length) {
    return <p className="p-6 text-center text-sm text-muted">Loading conversations…</p>;
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <MessageCircle size={30} className="text-muted" />
        <p className="mt-3 font-semibold">No chats yet</p>
        <p className="mt-1 text-sm text-muted">Start a conversation from anyone’s profile.</p>
      </div>
    );
  }

  return (
    <ul className={`divide-y divide-line overflow-y-auto ${className}`}>
      {conversations.map((conversation) => {
        const isOnline = conversation.otherUser && online.has(conversation.otherUser.id);
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover ${
                activeId === conversation.id ? 'bg-chip' : ''
              }`}
            >
              <span className="relative">
                <Avatar
                  name={conversation.title}
                  src={conversation.otherUser?.avatarUrl || ''}
                  size={40}
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{conversation.title}</span>
                  <span className="shrink-0 text-[10px] text-muted">{timeAgo(conversation.updatedAt)}</span>
                </span>
                <span className={`mt-0.5 block truncate text-xs ${conversation.unreadCount ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {conversation.lastMessage || 'No messages yet'}
                </span>
              </span>
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ConversationHeader({ showBack = false, onBack, onClose }) {
  const { activeConversation, online } = useChat();
  if (!activeConversation) return null;
  const isOnline = activeConversation.otherUser && online.has(activeConversation.otherUser.id);

  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
      {showBack && (
        <button type="button" onClick={onBack} className="icon-btn h-8 w-8" aria-label="Back to conversations">
          <ArrowLeft size={17} />
        </button>
      )}
      <span className="relative">
        <Avatar
          name={activeConversation.title}
          src={activeConversation.otherUser?.avatarUrl || ''}
          size={32}
        />
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-surface" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{activeConversation.title}</p>
        <p className="text-[11px] text-muted">{isOnline ? 'Online now' : 'Conversation'}</p>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="icon-btn h-8 w-8" aria-label="Close chat">
          <X size={17} />
        </button>
      )}
    </div>
  );
}

export function MessagePane({ className = '' }) {
  const { activeConversation, messages, typingUsers, sendMessage, notifyTyping } = useChat();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, typingUsers.length]);

  if (!activeConversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <MessageCircle size={34} className="text-muted" />
        <p className="mt-3 font-semibold">Pick up where you left off</p>
        <p className="mt-1 text-sm text-muted">Choose a conversation or message someone from their profile.</p>
      </div>
    );
  }

  const group = activeConversation.isGroup;

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted">No messages yet — say hello.</p>
        )}
        {messages.map((message) => {
          const mine = message.sender?.id === user?.id || message.sender?.username === user?.username;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'}`}>
                {group && !mine && (
                  <p className="mb-0.5 px-1 text-[10px] font-semibold text-muted">
                    {message.sender?.displayName || message.sender?.username || 'Unknown'}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                    mine
                      ? 'rounded-br-md bg-accent text-white'
                      : 'rounded-bl-md bg-chip text-ink'
                  } ${message.tempId ? 'opacity-70' : ''}`}
                >
                  {message.content}
                </div>
                <p className={`mt-0.5 px-1 text-[10px] text-muted ${mine ? 'text-right' : ''}`}>
                  {timeAgo(message.createdAt)}
                  {message.tempId ? ' · sending…' : ''}
                </p>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-1 py-1 text-xs text-muted">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-1">
              {typingUsers.slice(0, 2).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          sendMessage(text);
          setText('');
        }}
        className="flex items-end gap-2 border-t border-line px-3 py-2.5"
      >
        <textarea
          value={text}
          rows={1}
          onChange={(event) => {
            setText(event.target.value);
            notifyTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (text.trim()) {
                sendMessage(text);
                setText('');
              }
            }
          }}
          placeholder="Message…"
          aria-label="Message"
          className="max-h-24 flex-1 resize-none rounded-2xl border border-line bg-page px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
