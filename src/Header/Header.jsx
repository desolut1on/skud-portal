import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import userAvatar from '../assets/user-avatar.png';
import registerIcon from '../assets/register-icon.png';
import './Header.css';

export default function Header() {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleRegisterClick = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-wrapper">
          <Link to="/" className="logo-link">
            <img src={logo} alt="СКУД Портал" className="logo" />
            <span className="system-name">СКУД Портал</span>
          </Link>
        </div>

        <div className="user-controls">
          <Link 
            to="/register" 
            className="user-button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleRegisterClick}
          >
            <img 
              src={isHovered ? registerIcon : userAvatar} 
              alt={isHovered ? "Регистрация" : "Профиль"} 
              className={isHovered ? "register-icon" : "user-avatar"} 
            />
          </Link>
        </div>
      </div>
    </header>
  );
}