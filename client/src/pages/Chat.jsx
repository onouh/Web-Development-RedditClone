import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { ConversationHeader, ConversationList, MessagePane } from '../components/ChatParts.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { api } from '../lib/api.js';

export default function Chat() {
  const { conversations, activeConversation, openConversation, startConversation, clearActive } = useChat();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const autoOpened = useRef(false);

  useEffect(() => {
    const conversationId = params.get('c');
    if (conversationId) {
      autoOpened.current = true;
      openConversation(conversationId);
    }
  }, [params, openConversation]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!autoOpened.current && !activeConversation && conversations.length > 0) {
      autoOpened.current = true;
      openConversation(conversations[0].id);
    }
  }, [conversations, activeConversation, openConversation]);

  const { data: people } = useQuery({
    queryKey: ['chat-people', debounced],
    queryFn: () => api(`/search/suggest?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 1,
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="card flex h-[calc(100vh-120px)] min-h-[520px] overflow-hidden">
        <div className={`w-full flex-col border-r border-line sm:w-[320px] sm:shrink-0 ${activeConversation ? 'hidden sm:flex' : 'flex'}`}>
          <div className="border-b border-line p-3">
            <h1 className="mb-2 text-lg font-bold">Chats</h1>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find someone to message"
                aria-label="Find someone to message"
                className="w-full rounded-full border border-line bg-page py-2 pl-9 pr-3 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>

          {debounced.length > 1 ? (
            <div className="flex-1 overflow-y-auto">
              {people?.users?.length ? (
                people.users.map((person) => (
                  <button
                    key={person.username}
                    type="button"
                    onClick={async () => {
                      await startConversation(person.id);
                      setQuery('');
                      setDebounced('');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-hover"
                  >
                    <Avatar name={person.username} src={person.avatarUrl} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">u/{person.username}</span>
                      <span className="block truncate text-xs text-muted">{person.displayName}</span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-xs text-muted">No matching people.</p>
              )}
            </div>
          ) : (
            <ConversationList
              className="flex-1"
              onSelect={(id) => openConversation(id)}
            />
          )}
        </div>

        <div className={`min-w-0 flex-1 flex-col ${activeConversation ? 'flex' : 'hidden sm:flex'}`}>
          {activeConversation ? (
            <>
              <ConversationHeader showBack onBack={clearActive} />
              <MessagePane />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageCircle size={40} className="text-muted" />
              <h2 className="mt-3 text-lg font-bold">Your messages</h2>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Select a conversation, or search for someone by username to start a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
