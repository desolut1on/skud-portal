import { Link } from 'react-router-dom';
import './RegisterSuccess.css';

export default function RegisterSuccess() {
  return (
    <div className="register-success-page">
      <div className="success-container">
        <div className="success-icon">✓</div>
        <div className="success-message">
          <h2>Ваша заявка на регистрацию принята</h2>
          <p>Дождитесь активации учетной записи администратором</p>
          <Link to="/" className="btn btn-primary">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}