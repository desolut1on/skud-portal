import { useState, useContext, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';
import LoadingSpinner from '../LoadingSpinner';
import './RegisterForm.css';

export default function RegisterForm() {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '' 
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const validate = useCallback((name, value) => {
    if (!value) return 'Это поле обязательно';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Введите корректный email';
    }
    if (name === 'password' && value.length < 6) {
      return 'Пароль должен содержать минимум 6 символов';
    }
    if (name === 'name' && value.length < 2) {
      return 'Имя должно содержать минимум 2 символа';
    }
    return '';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validate(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const validationErrors = {
      email: validate('email', formData.email),
      password: validate('password', formData.password),
      name: validate('name', formData.name)
    };
    
 
    
    setErrors(validationErrors);
    setTouched({
      email: true,
      password: true,
      name: true
    });

    if (Object.values(validationErrors).some(err => err)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      await register(formData.email, formData.password, formData.name);
      navigate('/register-success');
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (field) => touched[field] && !errors[field];
  const isFieldInvalid = (field) => touched[field] && errors[field];

  return (
    <div className="register-form-page">
      <div className="register-form-container">
        <div className="form-header">
          <Link to="/" className="close-btn">
            <FaArrowLeft />
          </Link>
          <h1>Регистрация сотрудника</h1>
          <p>Заполните форму для создания учетной записи</p>
        </div>
        
        {errors.form && <div className="alert alert-danger">{errors.form}</div>}
        
        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <div className={`form-group ${isFieldValid('name') ? 'is-valid' : ''} ${isFieldInvalid('name') ? 'is-invalid' : ''}`}>
            <label>ФИО</label>
            <div className="input-wrapper">
              <FaUser className="input-icon" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Иванов Иван Иванович"
                required
                disabled={isSubmitting}
              />
              {isFieldValid('name') && <FaCheck className="valid-feedback-icon" />}
              {isFieldInvalid('name') && <FaTimes className="invalid-feedback-icon" />}
            </div>
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>
          
          <div className={`form-group ${isFieldValid('email') ? 'is-valid' : ''} ${isFieldInvalid('email') ? 'is-invalid' : ''}`}>
            <label>Email</label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="example@company.com"
                required
                disabled={isSubmitting}
              />
              {isFieldValid('email') && <FaCheck className="valid-feedback-icon" />}
              {isFieldInvalid('email') && <FaTimes className="invalid-feedback-icon" />}
            </div>
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>
          
          <div className={`form-group ${isFieldValid('password') ? 'is-valid' : ''} ${isFieldInvalid('password') ? 'is-invalid' : ''}`}>
            <label>Пароль</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Не менее 6 символов"
                minLength="6"
                required
                disabled={isSubmitting}
              />
              {isFieldValid('password') && <FaCheck className="valid-feedback-icon" />}
              {isFieldInvalid('password') && <FaTimes className="invalid-feedback-icon" />}
            </div>
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
          
          <div className="form-actions">
            <Link to="/" className="btn btn-back" disabled={isSubmitting}>
              <FaArrowLeft /> Назад
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoadingSpinner /> : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
        
        <div className="form-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}