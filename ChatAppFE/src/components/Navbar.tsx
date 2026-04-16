import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const Navbar = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = isAuthenticated && currentUser ? currentUser.name : 'Guest';

  return (
    <div className="fixed top-6 left-6 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
      >
        <div className="w-8 h-8 rounded-full border border-neutral-600 flex items-center justify-center text-neutral-300">
          <User size={22} />
        </div>
        <span className="text-sm font-medium text-neutral-300">{displayName}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg py-2 min-w-max">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-300 hover:text-red-200 hover:bg-neutral-800 transition-colors duration-200 text-sm"
            >
              <LogOut size={14} />
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate('/login');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-neutral-200 hover:bg-neutral-800 transition-colors duration-200 text-sm"
              >
                Login
              </button>
              <button
                onClick={() => {
                  navigate('/signup');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-neutral-200 hover:bg-neutral-800 transition-colors duration-200 text-sm"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Navbar;
