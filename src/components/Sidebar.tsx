import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, History, LogOut, Users, UserCog, FileText, CreditCard, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [companyName, setCompanyName] = useState('IR Assistência Técnica');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.company_name) setCompanyName(data.company_name);
        if (data.company_logo) setCompanyLogo(data.company_logo);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand-link">
          {companyLogo && (
            <img src={`${BASE_URL}${companyLogo}`} alt="Logo" className="sidebar-logo" />
          )}
          <h1>{companyName}</h1>
        </Link>
      </div>
      <nav className="sidebar-nav">
        {isAdmin && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        )}
        
        {isAdmin && (
          <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>
            <Package size={20} />
            <span>Produtos</span>
          </NavLink>
        )}
        
        {isAdmin && (
          <NavLink to="/sellers" className={({ isActive }) => isActive ? 'active' : ''}>
            <Users size={20} />
            <span>Vendedores</span>
          </NavLink>
        )}
        
        <NavLink to="/sales/new" className={({ isActive }) => isActive ? 'active' : ''}>
          <ShoppingCart size={20} />
          <span>Venda</span>
        </NavLink>
        
        <NavLink to="/budgets" className={({ isActive }) => isActive ? 'active' : ''}>
          <FileText size={20} />
          <span>Orçamentos</span>
        </NavLink>
        
        {isAdmin && (
          <NavLink to="/payables" className={({ isActive }) => isActive ? 'active' : ''}>
            <CreditCard size={20} />
            <span>Contas a Pagar</span>
          </NavLink>
        )}
        
        <NavLink to="/sales" className={({ isActive }) => isActive ? 'active' : ''}>
          <History size={20} />
          <span>Vendas</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
            <UserCog size={20} />
            <span>Usuários</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
            <SettingsIcon size={20} />
            <span>Gerenciamento</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/trash" className={({ isActive }) => isActive ? 'active' : ''}>
            <Trash2 size={20} />
            <span>Lixeira</span>
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info-sidebar">
           <p className="user-name">{user?.username}</p>
           <p className="user-role">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
