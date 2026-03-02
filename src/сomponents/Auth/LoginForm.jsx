import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaLock, FaSpinner } from 'react-icons/fa';
import '../../pages/Login.css';

export default function LoginForm() {
  const [credentials, setCredentials] = useState({
    email: 'anton@mail.ru',
    password: '123456'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError('Заполните все поля');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const user = await login(credentials.email, credentials.password);
      
      // Редирект в зависимости от роли
      if (user.isAdmin) {
        navigate('/admin');
      } else if (user.isOperator) {
        navigate('/operator');
      } else if (user.isEmployee) {
        navigate('/employee');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Вход в систему</h2>
          
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <FaUser className="input-icon" />
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Вход...
              </>
            ) : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}