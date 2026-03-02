import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FaSearch, FaSpinner, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import Header from '../Header/Header';
import Modal from '../сomponents/Modal/Modal';
import LoginForm from '../сomponents/Auth/LoginForm';
import './Home.css';

export default function Home() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [requestStatus, setRequestStatus] = useState({
    searchInput: '',
    loading: false,
    request: null,
    error: null
  });
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.isAdmin) {
        navigate('/admin');
      } else if (currentUser.isOperator) {
        navigate('/operator');
      } else if (currentUser.isEmployee) {
        navigate('/employee');
      }
    }
  }, [currentUser, navigate]);

  const handleStatusSearch = async () => {
    if (!requestStatus.searchInput.trim()) return;

    try {
      setRequestStatus(prev => ({ ...prev, loading: true, error: null, request: null }));
      
      const docRef = doc(db, 'guest_requests', requestStatus.searchInput);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const requestData = docSnap.data();
        setRequestStatus(prev => ({
          ...prev,
          request: {
            id: docSnap.id,
            ...requestData,
            createdAt: requestData.createdAt?.toDate(),
            approvedAt: requestData.approvedAt?.toDate(),
            rejectedAt: requestData.rejectedAt?.toDate()
          }
        }));
      } else {
        setRequestStatus(prev => ({ ...prev, error: 'Заявка не найдена' }));
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      setRequestStatus(prev => ({ ...prev, error: 'Ошибка при поиске заявки' }));
    } finally {
      setRequestStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FaCheckCircle className="status-icon approved" />;
      case 'rejected': return <FaTimesCircle className="status-icon rejected" />;
      default: return <FaClock className="status-icon pending" />;
    }
  };

  return (
    <div className="home-page">
      <Header />
      <div className="home-container">
        <div className="hero-section">
          <h1>Система контроля и управления доступом</h1>
          <p>Безопасный доступ к объектам предприятия</p>
          
          <div className="auth-options">
            <button 
              onClick={() => setShowLoginForm(true)}
              className="home-btn home-btn-primary"
            >
              Вход для сотрудников
            </button>
            <Link to="/guest" className="home-btn home-btn-outline">
              Я гость
            </Link>
          </div>
        </div>

        <div className="status-widget">
          <h2>Проверить статус заявки</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Введите ID заявки"
              value={requestStatus.searchInput}
              onChange={(e) => setRequestStatus(prev => ({ ...prev, searchInput: e.target.value }))}
            />
            <button 
              onClick={handleStatusSearch} 
              disabled={requestStatus.loading}
              className="search-button"
            >
              {requestStatus.loading ? <FaSpinner className="spinner" /> : <FaSearch />}
            </button>
          </div>

          {requestStatus.error && <div className="error-message">{requestStatus.error}</div>}

          {requestStatus.request && (
            <div className="request-status">
              <div className="status-header">
                {getStatusIcon(requestStatus.request.status)}
                <h3>Статус: {getStatusLabel(requestStatus.request.status)}</h3>
              </div>
              <div className="request-details">
                <p><strong>ID заявки:</strong> {requestStatus.request.id}</p>
                <p><strong>ФИО:</strong> {requestStatus.request.fullName}</p>
                <p><strong>Документ:</strong> {requestStatus.request.docType} {requestStatus.request.docNumber}</p>
                <p><strong>Дата создания:</strong> {requestStatus.request.createdAt?.toLocaleString()}</p>
                {requestStatus.request.approvedAt && (
                  <p><strong>Дата одобрения:</strong> {requestStatus.request.approvedAt?.toLocaleString()}</p>
                )}
                {requestStatus.request.rejectedAt && (
                  <p><strong>Дата отклонения:</strong> {requestStatus.request.rejectedAt?.toLocaleString()}</p>
                )}
                {requestStatus.request.rejectionReason && (
                  <p><strong>Причина отказа:</strong> {requestStatus.request.rejectionReason}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLoginForm && (
        <Modal onClose={() => setShowLoginForm(false)}>
          <LoginForm onSuccess={() => setShowLoginForm(false)} />
        </Modal>
      )}
    </div>
  );
}

function getStatusLabel(status) {
  switch (status) {
    case 'approved': return 'Одобрена';
    case 'rejected': return 'Отклонена';
    default: return 'На рассмотрении';
  }
}