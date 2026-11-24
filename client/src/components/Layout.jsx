import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import ChatDrawer from './ChatDrawer.jsx';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const toggleNavigation = () => {
    // Desktop collapses the rail in place; mobile opens the drawer.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarCollapsed((value) => !value);
    } else {
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <Navbar onMenuClick={toggleNavigation} navigationExpanded={!sidebarCollapsed} />

      <div className="mx-auto flex w-full max-w-[1280px]">
        <aside
          className={`sticky top-[57px] h-[calc(100vh-57px)] w-[264px] shrink-0 border-r border-line ${
            sidebarCollapsed ? 'hidden lg:hidden' : 'hidden lg:block'
          }`}
        >
          <Sidebar />
        </aside>

        <div className="min-w-0 flex-1 px-2.5 py-4 sm:px-4">
          <Outlet />
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute left-0 top-0 h-full w-[280px] animate-fade-in bg-surface shadow-pop">
            <div className="flex h-[57px] items-center justify-between border-b border-line px-3">
              <p className="font-bold">Navigation</p>
              <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </div>
            <div className="h-[calc(100%-57px)]">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <ChatDrawer />
    </>
  );
}
