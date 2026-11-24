import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  LogOut,
  MessageCircle,
  Moon,
  Menu,
  Plus,
  Search,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import Logo from './Logo.jsx';
import SearchBar from './SearchBar.jsx';
import NotificationsMenu from './NotificationsMenu.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import useClickOutside from '../hooks/useClickOutside.js';

export default function Navbar({ onMenuClick, navigationExpanded = true }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadTotal, setOpen, open } = useChat();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);

  useClickOutside(menuRef, () => setUserMenu(false), userMenu);

  return (
    <header className="sticky top-0 z-40 h-[57px] border-b border-line bg-surface">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          className="icon-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          aria-expanded={navigationExpanded}
        >
          <Menu size={21} />
        </button>

        <Logo />

        <SearchBar className="hidden max-w-[560px] flex-1 sm:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/search" className="icon-btn sm:hidden" aria-label="Search">
            <Search size={20} />
          </Link>

          <Link to="/submit" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-hover hover:text-ink sm:flex">
            <Plus size={18} />
            Create
          </Link>

          <button
            type="button"
            className="icon-btn relative"
            aria-label="Open chat"
            onClick={() => {
              if (!user) return navigate('/login');
              setOpen(!open);
            }}
          >
            <MessageCircle size={20} />
            {unreadTotal > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            )}
          </button>

          <NotificationsMenu />

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenu((value) => !value)}
                aria-label="Account menu"
                aria-expanded={userMenu}
                className="rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-line"
              >
                <Avatar name={user.username} src={user.avatarUrl} size={32} />
              </button>

              {userMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated py-1 text-sm shadow-pop">
                  <div className="border-b border-line px-4 py-3">
                    <p className="font-semibold">u/{user.username}</p>
                    <p className="text-xs text-muted">
                      {user.karma ?? (user.postKarma || 0) + (user.commentKarma || 0)} karma
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenu(false);
                      navigate(`/u/${user.username}`);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-hover"
                  >
                    <UserIcon size={16} /> View profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenu(false);
                      navigate('/saved');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-hover"
                  >
                    <Bookmark size={16} /> Saved posts
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-hover"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenu(false);
                      await logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2 border-t border-line px-4 py-2 text-left hover:bg-hover"
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link to="/login" className="btn-ghost hidden px-3 py-1.5 text-sm sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn-primary px-3 py-1.5 text-sm">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
