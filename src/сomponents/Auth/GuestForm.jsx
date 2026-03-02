import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTimes, FaCheck, FaCalendarAlt, FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import PropTypes from 'prop-types';
import ReCAPTCHA from 'react-google-recaptcha';
import './GuestForm.css';

export default function GuestForm({ onSubmit, isEmployeeMode = false, isOperatorMode = false }) {
  const [formData, setFormData] = useState({
    fullName: '',
    docType: 'Паспорт РФ',
    docNumber: '',
    email: '',
    startDate: '',
    endDate: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('visitor');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(isEmployeeMode || isOperatorMode);
  const [requestInfo, setRequestInfo] = useState({
    id: null,
    number: null,
    trackingCode: null
  });
  const captchaRef = useRef(null);
  const navigate = useNavigate();

  // Генерация номера заявки (формат: REQ-YYYYMMDD-XXXX)
  const generateRequestNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${datePart}-${randomPart}`;
  };

  // Генерация кода для отслеживания (6 цифр)
  const generateTrackingCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Введите ФИО';
    if (!formData.docNumber.trim()) newErrors.docNumber = 'Введите номер документа';
    if (!formData.email.trim()) newErrors.email = 'Введите email';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Введите корректный email';
    if (!formData.startDate) newErrors.startDate = 'Укажите дату начала';
    if (!formData.endDate) newErrors.endDate = 'Укажите дату окончания';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'Необходимо согласие';
    if (!captchaVerified && !isEmployeeMode && !isOperatorMode) newErrors.captcha = 'Подтвердите, что вы не робот';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    validateForm();
  }, [formData, captchaVerified]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCaptchaChange = (value) => {
    setCaptchaVerified(!!value);
  };

  const handleNext = () => {
    if (validateForm()) {
      setActiveTab('review');
    }
  };

  const handleSubmit = () => {
    if (isEmployeeMode || isOperatorMode) {
      onSubmit(formData);
      setShowSuccess(true);
    } else {
      setShowConfirmation(true);
    }
  };

  const confirmSubmit = async () => {
    try {
      // Сбрасываем капчу
      if (captchaRef.current) {
        captchaRef.current.reset();
      }
      setCaptchaVerified(false);

      const requestNumber = generateRequestNumber();
      const trackingCode = generateTrackingCode();

      const docRef = await addDoc(collection(db, isEmployeeMode || isOperatorMode ? 'guest_passes' : 'guest_requests'), {
        ...formData,
        status: isEmployeeMode || isOperatorMode ? 'active' : 'pending',
        createdAt: serverTimestamp(),
        createdBy: isEmployeeMode || isOperatorMode ? 'employee' : 'guest',
        privacyConsent: formData.agreeToTerms,
        privacyConsentDate: serverTimestamp(),
        requestNumber,
        trackingCode
      });

      setRequestInfo({
        id: docRef.id,
        number: requestNumber,
        trackingCode
      });
      setShowConfirmation(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Ошибка при отправке:', error);
      setErrors({ submit: 'Ошибка при отправке данных' });
      setShowConfirmation(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="success-container">
        <div className="success-message">
          <FaCheck className="success-icon" />
          <h2>{isEmployeeMode || isOperatorMode ? 'Пропуск создан' : 'Заявка отправлена'}</h2>
          <p>
            {isEmployeeMode || isOperatorMode 
              ? 'Гостевой пропуск успешно создан' 
              : `Ваша заявка №${requestInfo.number} принята в обработку`}
          </p>
          {!isEmployeeMode && !isOperatorMode && (
            <div className="tracking-info">
              <p>Номер заявки: <strong>{requestInfo.number}</strong></p>
              <p>Код для отслеживания: <strong>{requestInfo.trackingCode}</strong></p>
              <p>Используйте эти данные для проверки статуса заявки</p>
            </div>
          )}
          <Link to={isEmployeeMode ? "/employee" : isOperatorMode ? "/operator" : "/"} className="btn btn-primary">
            {isEmployeeMode || isOperatorMode ? 'Вернуться' : 'На главную'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-form-container">
      <Link to={isEmployeeMode ? "/employee" : isOperatorMode ? "/operator" : "/"} className="close-btn">
        <FaTimes />
      </Link>

      <h1>{isEmployeeMode || isOperatorMode ? 'Создание пропуска' : 'Заявка на посещение'}</h1>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'visitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitor')}
        >
          Данные
        </button>
        <button 
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={handleNext}
          disabled={Object.keys(errors).length > 0}
        >
          Проверка
        </button>
      </div>

      {activeTab === 'visitor' ? (
        <div className="form-step">
          <div className="form-group">
            <label>ФИО</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? 'error' : ''}
              placeholder="Иванов Иван Иванович"
            />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Тип документа</label>
              <select name="docType" value={formData.docType} onChange={handleChange}>
                <option>Паспорт РФ</option>
                <option>Загранпаспорт</option>
                <option>Водительское удостоверение</option>
              </select>
            </div>
            <div className="form-group">
              <label>Номер документа</label>
              <input
                type="text"
                name="docNumber"
                value={formData.docNumber}
                onChange={handleChange}
                className={errors.docNumber ? 'error' : ''}
                placeholder="1234 567890"
              />
              {errors.docNumber && <span className="error-message">{errors.docNumber}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="example@mail.ru"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Дата начала</label>
              <div className="date-input">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={errors.startDate ? 'error' : ''}
                  min={new Date().toISOString().split('T')[0]}
                />
                <FaCalendarAlt className="calendar-icon" />
              </div>
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label>Дата окончания</label>
              <div className="date-input">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={errors.endDate ? 'error' : ''}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
                <FaCalendarAlt className="calendar-icon" />
              </div>
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>

          {!isEmployeeMode && !isOperatorMode && (
            <div className="form-group">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey="6Lfqd1ErAAAAANWc5fXZFq5gIxJ7kbpRv6Sb4AB2"
                onChange={handleCaptchaChange}
              />
              {errors.captcha && <span className="error-message">{errors.captcha}</span>}
            </div>
          )}

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className={errors.agreeToTerms ? 'error' : ''}
            />
            <label htmlFor="agreeToTerms">
              Согласен на обработку персональных данных
              <button 
                type="button" 
                className="privacy-link"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPrivacyModal(true);
                }}
              >
                (Политика конфиденциальности) <FaExternalLinkAlt size={12} />
              </button>
            </label>
            {errors.agreeToTerms && <span className="error-message">{errors.agreeToTerms}</span>}
          </div>

          <div className="form-actions">
            <Link to={isEmployeeMode ? "/employee" : isOperatorMode ? "/operator" : "/"} className="btn btn-back">
              <FaArrowLeft /> Назад
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Далее
            </button>
          </div>
        </div>
      ) : (
        <div className="review-step">
          <h2>Проверьте данные</h2>
          
          <div className="review-data">
            <div className="review-item">
              <span>ФИО:</span>
              <strong>{formData.fullName}</strong>
            </div>
            <div className="review-item">
              <span>Документ:</span>
              <strong>{formData.docType} {formData.docNumber}</strong>
            </div>
            <div className="review-item">
              <span>Email:</span>
              <strong>{formData.email}</strong>
            </div>
            <div className="review-item">
              <span>Период:</span>
              <strong>
                {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
              </strong>
            </div>
            <div className="review-item">
              <span>Согласие на обработку:</span>
              <strong>{formData.agreeToTerms ? 'Да' : 'Нет'}</strong>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-back" onClick={() => setActiveTab('visitor')}>
              Назад
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              {isEmployeeMode || isOperatorMode ? 'Создать' : 'Отправить'}
            </button>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Подтвердите отправку</h3>
            <p>Вы уверены, что хотите отправить заявку?</p>
            <div className="confirmation-actions">
              <button className="btn btn-back" onClick={() => setShowConfirmation(false)}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={confirmSubmit}>
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrivacyModal && <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />}
    </div>
  );
}

GuestForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isEmployeeMode: PropTypes.bool,
  isOperatorMode: PropTypes.bool
};