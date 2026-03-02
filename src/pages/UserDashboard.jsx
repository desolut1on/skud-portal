import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  return (
    <div className="user-dashboard">
      <h1>Личный кабинет</h1>
      {currentUser?.approved ? (
        <div className="approved-status">
          <h2>Ваш аккаунт подтверждён</h2>
          <p>Добро пожаловать, {currentUser.name || currentUser.email}!</p>
        </div>
      ) : (
        <div className="pending-status">
          <h2>Ваш аккаунт ожидает подтверждения</h2>
          <p>Администратор ещё не подтвердил вашу регистрацию.</p>
        </div>
      )}
    </div>
  );
}