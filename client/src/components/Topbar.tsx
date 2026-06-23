import React, { useRef } from 'react';
import { User, Camera, Menu, Monitor, Smartphone, Tablet } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import { getDeviceInfo } from '../utils/device';
import './Topbar.css';

interface TopbarProps {
  title?: string;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ title = 'Sistema', onMenuClick, isMobile }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceInfo = getDeviceInfo();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/users/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Update local storage user image
        const updatedUser = { ...user, image_url: data.image_url };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Refresh page to show new image
        window.location.reload();
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
    }
  };

  const renderDeviceIcon = () => {
    switch (deviceInfo.type) {
      case 'mobile':
        return <Smartphone size={16} className="device-icon" />;
      case 'tablet':
        return <Tablet size={16} className="device-icon" />;
      default:
        return <Monitor size={16} className="device-icon" />;
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isMobile && (
          <button onClick={onMenuClick} className="menu-toggle-btn" aria-label="Abrir menu">
            <Menu size={24} />
          </button>
        )}
        <h2>{title}</h2>
      </div>
      <div className="topbar-right">
        <div className="device-badge" title={`Navegador: ${deviceInfo.browser} | OS: ${deviceInfo.os}`} style={{ marginRight: '1rem' }}>
          {renderDeviceIcon()}
          <span>{deviceInfo.name}</span>
        </div>
        <div className="user-profile">
          <div className="user-info">
            <span className="username">{user.username || 'Admin'}</span>
            <span className="role">{user.role || 'Administrator'}</span>
          </div>
          <div className="avatar profile-avatar" onClick={handleAvatarClick} title="Alterar foto de perfil">
            {user.image_url ? (
              <img src={`${BASE_URL}${user.image_url}`} alt={user.username} className="user-photo" />
            ) : (
              <User size={20} />
            )}
            <div className="avatar-overlay">
              <Camera size={14} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
