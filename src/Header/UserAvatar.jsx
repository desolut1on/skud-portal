import { useState } from 'react';
import { Link } from 'react-router-dom'; 
import avatar from '../../assets/user-avatar.png';
import './UserAvatar.css';

export default function UserAvatar() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="avatar-container">
      <img 
        src={avatar} 
        alt="User" 
        className="user-avatar"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="tooltip">
          <Link to="/register">Регистрация</Link>
        </div>
      )}
    </div>
  );
}