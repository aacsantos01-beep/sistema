import React, { useRef } from 'react';
import { User, Camera } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import './Topbar.css';

interface TopbarProps {
  title: string;
}

const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
      </div>
      <div className="topbar-right">
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
