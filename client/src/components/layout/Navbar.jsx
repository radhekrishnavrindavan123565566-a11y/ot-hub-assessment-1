import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roleConfig = {
  employee: {
    links: [
      { to: '/slots', label: 'OT Slots', icon: '📋' },
      { to: '/my-ot', label: 'My OT', icon: '⏱️' },
    ],
    gradient: 'from-emerald-600 to-teal-600',
    badge: 'bg-emerald-500',
    badgeLabel: 'Employee',
  },
  manager: {
    links: [
      { to: '/slots', label: 'Slots', icon: '📋' },
      { to: '/slots/new', label: 'New Slot', icon: '➕' },
      { to: '/reports', label: 'Reports', icon: '📊' },
    ],
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'bg-blue-500',
    badgeLabel: 'Manager',
  },
  admin: {
    links: [
      { to: '/slots', label: 'Slots', icon: '📋' },
      { to: '/users', label: 'Users', icon: '👥' },
      { to: '/reports', label: 'Reports', icon: '📊' },
      { to: '/audit-logs', label: 'Audit', icon: '🔍' },
    ],
    gradient: 'from-purple-600 to-pink-600',
    badge: 'bg-purple-500',
    badgeLabel: 'Admin',
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const config = roleConfig[user?.role] || roleConfig.employee;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to) => {
    if (to === '/slots') return location.pathname === '/slots';
    return location.pathname.startsWith(to);
  };

  return (
    <nav className={`bg-gradient-to-r ${config.gradient} shadow-lg sticky top-0 z-50`} aria-label="Main navigation">
      {/* Subtle shimmer line on top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-white/0 via-white/40 to-white/0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner group-hover:bg-white/30 transition-all duration-200 group-hover:scale-110">
              <span className="text-white font-bold text-sm">⚙</span>
            </div>
            <div>
              <span className="text-white font-extrabold text-lg leading-none tracking-tight">OT Hub</span>
              <span className="block text-white/60 text-[10px] leading-none font-medium">Sundar Precision</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {config.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(link.to)
                    ? 'bg-white/25 text-white shadow-inner'
                    : 'text-white/80 hover:text-white hover:bg-white/15'
                }`}
              >
                <span className="text-base leading-none">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: user info + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="text-right leading-none">
                <p className="text-white text-xs font-semibold">{user?.name?.split(' ')[0]}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full ${config.badge} text-white text-[9px] font-bold uppercase tracking-wide`}>
                  {config.badgeLabel}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-lg transition-all duration-150 btn-press"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 bg-white/15 rounded-lg text-white"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden animate-slide-down bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {config.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/15 transition-all"
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
