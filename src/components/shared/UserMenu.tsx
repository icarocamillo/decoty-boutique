
import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown, Moon, Sun, Users, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserMenuProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ isDarkMode, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, userRole, userName, signOut } = useAuth();
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/erp/login');
  };

  const roleLabel = userRole === 'manager' ? 'Gerente' : 'Vendedor';
  const displayUserName = userName || 'Usuário';
  const isManager = userRole === 'manager';

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700 group"
      >
        <div className="hidden sm:flex flex-col items-end justify-center text-right mr-0.5">
          <span className="text-sm font-bold text-zinc-800 dark:text-white leading-tight mb-0.5">
            {displayUserName}
          </span>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-tight">
            Perfil de acesso: {roleLabel}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight truncate max-w-[150px]">
            {user?.email}
          </span>
        </div>

        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-colors">
          <User size={20} />
        </div>
        
        <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-100 dark:border-zinc-800 py-2 z-50 animate-fade-in-up origin-top-right">
          <div className="px-4 py-3 border-b border-zinc-50 dark:border-zinc-800 sm:hidden">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{displayUserName}</p>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Perfil de acesso: {roleLabel}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{user?.email}</p>
          </div>
          
          <div className="py-1">
            <button 
              onClick={() => {
                navigate('/erp/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <UserCircle size={16} />
              <span>Meu Perfil</span>
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            {isManager && (
              <button 
                onClick={() => {
                  navigate('/erp/team');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <Users size={16} />
                <span>Gerenciar Acessos</span>
              </button>
            )}

            {isManager && (
              <button 
                onClick={() => {
                  navigate('/erp/settings');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                <Settings size={16} />
                <span>Configurações do Sistema</span>
              </button>
            )}
          </div>
          
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1 mt-1">
            <button 
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
