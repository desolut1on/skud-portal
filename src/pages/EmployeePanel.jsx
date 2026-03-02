import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  FaSignOutAlt, 
  FaUserPlus, 
  FaHistory,
  FaCheck,
  FaCalendarAlt,
  FaIdCard,
  FaSpinner,
  FaExternalLinkAlt
} from 'react-icons/fa';
import GuestForm from '../сomponents/Auth/GuestForm';
import PrivacyPolicyModal from '../сomponents/Auth/PrivacyPolicyModal';
import './EmployeePanel.css';

export default function EmployeePanel() {
  const { currentUser, isEmployee, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('create');
  const [guestPasses, setGuestPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEmployee) {
      navigate('/');
      return;
    }
    fetchGuestPasses();
  }, [isEmployee, navigate]);

  const fetchGuestPasses = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'guest_passes'),
        where('createdBy', '==', currentUser.uid),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      const passes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setGuestPasses(passes);
    } catch (error) {
      console.error('Error fetching guest passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePass = async (formData) => {
    try {
      if (!formData.agreeToTerms) {
        throw new Error('Необходимо согласие на обработку персональных данных');
      }

      await addDoc(collection(db, 'guest_passes'), {
        fullName: formData.fullName,
        docType: formData.docType,
        docNumber: formData.docNumber,
        email: formData.email,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'active',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        note: `Создано сотрудником ${currentUser.email}`,
        privacyConsent: true,
        privacyConsentDate: serverTimestamp()
      });
      
      setShowSuccess('Гостевой пропуск успешно создан');
      setTimeout(() => setShowSuccess(false), 3000);
      fetchGuestPasses();
      return { success: true };
    } catch (error) {
      console.error('Error creating pass:', error);
      return { error: error.message || 'Ошибка при создании пропуска' };
    }
  };

  if (loading) {
    return (
      <div className="employee-loading">
        <FaSpinner className="spinner-icon" />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="employee-panel">
      <div className="employee-header">
        <div className="header-info">
          <h1>Личный кабинет сотрудника</h1>
          <p className="user-email">{currentUser?.email}</p>
        </div>
        <button onClick={logout} className="logout-btn">
          <FaSignOutAlt /> Выйти
        </button>
      </div>

      <div className="employee-tabs">
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <FaUserPlus /> Создать пропуск
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FaHistory /> История ({guestPasses.length})
        </button>
      </div>

      {showSuccess && (
        <div className="success-message">
          <FaCheck /> {showSuccess}
        </div>
      )}

      <div className="employee-content">
        {activeTab === 'create' ? (
          <div className="create-pass-section">
            <h2><FaUserPlus /> Создание гостевого пропуска</h2>
            <GuestForm 
              onSubmit={handleCreatePass} 
              isEmployeeMode={true} 
            />
          </div>
        ) : (
          <div className="history-section">
            <h2><FaHistory /> Активные пропуска</h2>
            {guestPasses.length > 0 ? (
              <div className="passes-list">
                {guestPasses.map(pass => (
                  <div key={pass.id} className="pass-card">
                    <div className="pass-header">
                      <h3>{pass.fullName}</h3>
                      <div className="pass-meta">
                        <span className="pass-date">
                          <FaCalendarAlt /> {pass.createdAt?.toLocaleDateString()}
                        </span>
                        <span className="pass-status active">
                          <FaCheck /> Активен
                        </span>
                      </div>
                    </div>
                    <div className="pass-details">
                      <p><FaIdCard /> {pass.docType} {pass.docNumber}</p>
                      <p>Email: {pass.email}</p>
                      <p>Период: {new Date(pass.startDate).toLocaleDateString()} — {new Date(pass.endDate).toLocaleDateString()}</p>
                      <p>Согласие на обработку данных: {pass.privacyConsent ? 'Да' : 'Нет'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-passes">
                <p>Нет активных пропусков</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showPrivacyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
      )}
    </div>
  );
}