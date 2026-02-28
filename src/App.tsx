import { useState, useEffect } from 'react';
import { User, Role } from './types';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Home from './components/Home';
import Profile from './components/Profile';
import Admin from './components/Admin';
import ServicesManager from './components/ServicesManager';
import Financials from './components/Financials';
import Loans from './components/Loans';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'home' | 'profile' | 'admin' | 'services' | 'financials' | 'loans'>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const handleLogin = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('home');
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>;

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} currentView={view} setView={setView} onLogout={handleLogout}>
      {view === 'home' && <Home />}
      {view === 'profile' && <Profile user={user} token={token!} />}
      {view === 'loans' && <Loans user={user} token={token!} />}
      {view === 'services' && user.role === 'admin' && <ServicesManager token={token!} />}
      {view === 'financials' && user.role === 'admin' && <Financials token={token!} />}
      {view === 'admin' && user.role === 'admin' && <Admin token={token!} />}
    </Layout>
  );
}
