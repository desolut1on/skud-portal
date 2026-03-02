import LoginForm from '../сomponents/Auth/LoginForm';
import ParticlesBackground from '../сomponents/ParticlesBackground';
import './Login.css';

export default function Login() {
  return (
    <div className="login-page">
      <ParticlesBackground />
      <div className="login-container">
        <LoginForm />
      </div>
    </div>
  );
}