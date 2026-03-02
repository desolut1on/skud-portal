import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  FaSignOutAlt, 
  FaCheck, 
  FaTimes, 
  FaUserPlus, 
  FaList, 
  FaUserClock,
  FaUserCheck,
  FaUserSlash,
  FaSearch,
  FaExclamationTriangle,
  FaUndo,
  FaCopy,
  FaIdCard
} from 'react-icons/fa';
import GuestForm from '../сomponents/Auth/GuestForm';
import './OperatorPanel.css';

const STATUSES = {
  pending: { label: 'Ожидающие', icon: <FaUserClock />, color: '#FFA500' },
  approved: { label: 'Одобренные', icon: <FaUserCheck />, color: '#4CAF50' },
  rejected: { label: 'Отклоненные', icon: <FaUserSlash />, color: '#F44336' }
};

const PASS_STATUSES = {
  pending: { label: 'На рассмотрении', icon: <FaUserClock />, color: '#FFA500' },
  approved: { label: 'Одобрено', icon: <FaUserCheck />, color: '#4CAF50' },
  rejected: { label: 'Отклонено', icon: <FaUserSlash />, color: '#F44336' }
};

export default function OperatorPanel() {
  const { currentUser, isOperator, isAdmin, logout } = useContext(AuthContext);
  const [state, setState] = useState({
    activeTab: 'pending',
    guestRequests: [],
    passRequests: [],
    loading: true,
    error: null,
    successMessage: null,
    searchTerm: '',
    selectedRequest: null,
    selectedPassRequest: null,
    copiedId: null
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (!isOperator && !isAdmin) {
      navigate('/');
      return;
    }
    fetchGuestRequests();
    fetchPassRequests();
  }, [isOperator, isAdmin, navigate, state.activeTab]);

  const fetchGuestRequests = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const q = state.activeTab === 'all'
        ? query(collection(db, 'guest_requests'))
        : query(collection(db, 'guest_requests'), where('status', '==', state.activeTab));
      
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        approvedAt: doc.data().approvedAt?.toDate(),
        rejectedAt: doc.data().rejectedAt?.toDate()
      }));

      setState(prev => ({
        ...prev,
        guestRequests: requests,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching guest requests:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Ошибка загрузки заявок. Проверьте права доступа.'
      }));
    }
  };

  const fetchPassRequests = async () => {
    try {
      const q = query(collection(db, 'pass_requests'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setState(prev => ({
        ...prev,
        passRequests: requests
      }));
    } catch (error) {
      console.error('Error fetching pass requests:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setState(prev => ({ ...prev, copiedId: text }));
    setTimeout(() => setState(prev => ({ ...prev, copiedId: null })), 2000);
  };

  const handleRequestAction = async (action, request) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        [`${action}At`]: serverTimestamp(),
        [`${action}By`]: currentUser.uid
      };

      if (action === 'reject') {
        updateData.rejectionReason = 'Отклонено оператором';
      }

      await updateDoc(doc(db, 'guest_requests', request.id), updateData);

      if (action === 'approve') {
        await createSkudRegistration(request);
      }

      await fetchGuestRequests();
      setState(prev => ({
        ...prev,
        successMessage: action === 'approve' 
          ? 'Заявка успешно одобрена' 
          : 'Заявка отклонена'
      }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      setState(prev => ({
        ...prev,
        error: `Ошибка при ${action === 'approve' ? 'одобрении' : 'отклонении'} заявки`
      }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const handlePassRequestAction = async (action, request) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        [`${action}At`]: serverTimestamp(),
        [`${action}By`]: currentUser.uid
      };

      if (action === 'reject') {
        updateData.rejectionReason = 'Отклонено оператором';
      }

      await updateDoc(doc(db, 'pass_requests', request.id), updateData);

      if (action === 'approve') {
        await createGuestPass(request);
      }

      await fetchPassRequests();
      setState(prev => ({
        ...prev,
        successMessage: action === 'approve' 
          ? 'Запрос на пропуск одобрен' 
          : 'Запрос на пропуск отклонен',
        selectedPassRequest: null
      }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error(`Error ${action}ing pass request:`, error);
      setState(prev => ({
        ...prev,
        error: `Ошибка при ${action === 'approve' ? 'одобрении' : 'отклонении'} запроса на пропуск`
      }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const createSkudRegistration = async (request) => {
    await addDoc(collection(db, 'skud_registrations'), {
      fullName: request.fullName,
      docType: request.docType,
      docNumber: request.docNumber,
      email: request.email,
      startDate: request.startDate,
      endDate: request.endDate,
      accessType: 'Гостевой пропуск',
      note: `Создан через систему заявок (ID: ${request.id})`,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
      privacyConsent: request.agreeToTerms,
      privacyConsentDate: serverTimestamp()
    });
  };

  const createGuestPass = async (request) => {
    await addDoc(collection(db, 'guest_passes'), {
      fullName: request.fullName,
      docType: request.docType,
      docNumber: request.docNumber,
      email: request.email,
      startDate: request.startDate,
      endDate: request.endDate,
      accessType: 'Гостевой пропуск',
      note: `Создан оператором (ID запроса: ${request.id})`,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
      privacyConsent: true,
      privacyConsentDate: serverTimestamp()
    });
  };

  const handleCreatePass = async (formData) => {
    try {
      await addDoc(collection(db, 'pass_requests'), {
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });

      setState(prev => ({
        ...prev,
        successMessage: 'Запрос на создание пропуска отправлен на рассмотрение',
        activeTab: 'pending'
      }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
      return { success: true };
    } catch (error) {
      console.error('Error creating pass request:', error);
      setState(prev => ({
        ...prev,
        error: 'Ошибка при создании запроса на пропуск'
      }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
      return { error: error.message };
    }
  };

  const filteredRequests = state.guestRequests.filter(request => 
    ['fullName', 'email', 'docNumber', 'id'].some(field =>
      request[field]?.toString().toLowerCase().includes(state.searchTerm.toLowerCase())
    )
  );

  const filteredPassRequests = state.passRequests.filter(request => 
    ['fullName', 'email', 'docNumber', 'id'].some(field =>
      request[field]?.toString().toLowerCase().includes(state.searchTerm.toLowerCase())
    )
  );

  const openRequestDetails = (request) => {
    setState(prev => ({ ...prev, selectedRequest: request }));
  };

  const openPassRequestDetails = (request) => {
    setState(prev => ({ ...prev, selectedPassRequest: request }));
  };

  const closeRequestDetails = () => {
    setState(prev => ({ ...prev, selectedRequest: null, selectedPassRequest: null }));
  };

  if (state.loading) {
    return (
      <div className="operator-loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="operator-panel">
      <div className="operator-header">
        <h1>
          <span>Панель {isAdmin ? 'администратора' : 'оператора'}</span>
          <span className="user-email">{currentUser?.email}</span>
        </h1>
        <button onClick={logout} className="logout-btn">
          <FaSignOutAlt /> Выйти
        </button>
      </div>

      {state.error && (
        <div className="error-message">
          <FaExclamationTriangle /> {state.error}
        </div>
      )}

      {state.successMessage && (
        <div className="success-message">
          <FaCheck /> {state.successMessage}
        </div>
      )}

      <div className="operator-tabs">
        {Object.entries(STATUSES).map(([key, { label, icon }]) => (
          <button
            key={key}
            className={`tab-button ${state.activeTab === key ? 'active' : ''}`}
            onClick={() => setState(prev => ({ ...prev, activeTab: key }))}
          >
            {icon} {label}
          </button>
        ))}
        <button
          className={`tab-button ${state.activeTab === 'pass_requests' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'pass_requests' }))}
        >
          <FaList /> Запросы на пропуска ({state.passRequests.length})
        </button>
        <button
          className={`tab-button ${state.activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'create' }))}
        >
          <FaUserPlus /> Создать пропуск
        </button>
      </div>

      <div className="operator-content">
        {state.activeTab === 'create' ? (
          <div className="create-pass-section">
            <h2><FaUserPlus /> Создание гостевого пропуска</h2>
            <GuestForm 
              onSubmit={handleCreatePass} 
              isOperatorMode={true} 
            />
          </div>
        ) : state.activeTab === 'pass_requests' ? (
          <div className="requests-section">
            <div className="requests-header">
              <h2>
                <FaList /> Запросы на пропуска ({filteredPassRequests.length})
              </h2>
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, email, номеру документа или ID"
                  value={state.searchTerm}
                  onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
            </div>
            
            {filteredPassRequests.length > 0 ? (
              <div className="requests-list">
                {filteredPassRequests.map(request => (
                  <div 
                    key={request.id} 
                    className="request-card"
                    style={{ borderLeft: `4px solid ${PASS_STATUSES[request.status]?.color || '#6a11cb'}`}}
                  >
                    <div className="request-header">
                      <div className="request-title" onClick={() => openPassRequestDetails(request)}>
                        <h3>{request.fullName}</h3>
                        <div className="request-id">
                          <FaIdCard /> ID: {request.id}
                          <button 
                            className="copy-id-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(request.id);
                            }}
                            title="Копировать ID"
                          >
                            <FaCopy />
                            {state.copiedId === request.id && <span className="copied-tooltip">Скопировано!</span>}
                          </button>
                        </div>
                      </div>
                      <div className="request-meta">
                        <span className="request-date">
                          {request.createdAt?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="request-details">
                      <p><strong>Документ:</strong> {request.docType} {request.docNumber}</p>
                      <p><strong>Email:</strong> {request.email}</p>
                      <p>
                        <strong>Период:</strong> {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="request-actions">
                      <button
                        onClick={() => handlePassRequestAction('approve', request)}
                        className="approve-button"
                      >
                        <FaCheck /> Одобрить
                      </button>
                      <button
                        onClick={() => handlePassRequestAction('reject', request)}
                        className="reject-button"
                      >
                        <FaTimes /> Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-requests">
                <p>Нет запросов на создание пропусков</p>
              </div>
            )}
          </div>
        ) : (
          <div className="requests-section">
            <div className="requests-header">
              <h2>
                {STATUSES[state.activeTab]?.icon || <FaList />} 
                {STATUSES[state.activeTab]?.label || 'Все заявки'} ({filteredRequests.length})
              </h2>
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, email, номеру документа или ID"
                  value={state.searchTerm}
                  onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
            </div>
            
            {filteredRequests.length > 0 ? (
              <div className="requests-list">
                {filteredRequests.map(request => (
                  <div 
                    key={request.id} 
                    className={`request-card ${request.status}`}
                    style={{ borderLeft: `4px solid ${STATUSES[request.status]?.color || '#6a11cb'}`}}
                  >
                    <div className="request-header">
                      <div className="request-title" onClick={() => openRequestDetails(request)}>
                        <h3>{request.fullName}</h3>
                        <div className="request-id">
                          <FaIdCard /> ID: {request.id}
                          <button 
                            className="copy-id-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(request.id);
                            }}
                            title="Копировать ID"
                          >
                            <FaCopy />
                            {state.copiedId === request.id && <span className="copied-tooltip">Скопировано!</span>}
                          </button>
                        </div>
                      </div>
                      <div className="request-meta">
                        <span className="request-date">
                          {request.createdAt?.toLocaleDateString()}
                        </span>
                        {request.status === 'approved' && (
                          <span className="request-approved">
                            <FaUserCheck /> Одобрено: {request.approvedAt?.toLocaleDateString()}
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="request-rejected">
                            <FaUserSlash /> Отклонено: {request.rejectedAt?.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="request-details">
                      <p><strong>Документ:</strong> {request.docType} {request.docNumber}</p>
                      <p><strong>Email:</strong> {request.email}</p>
                      <p>
                        <strong>Период:</strong> {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      {request.rejectionReason && (
                        <p><strong>Причина отказа:</strong> {request.rejectionReason}</p>
                      )}
                    </div>
                    
                    <div className="request-actions">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRequestAction('approve', request)}
                            className="approve-button"
                          >
                            <FaCheck /> Одобрить
                          </button>
                          <button
                            onClick={() => handleRequestAction('reject', request)}
                            className="reject-button"
                          >
                            <FaTimes /> Отклонить
                          </button>
                        </>
                      )}
                      {request.status === 'rejected' && (
                        <button
                          onClick={() => handleRequestAction('approve', request)}
                          className="approve-button"
                        >
                          <FaUndo /> Одобрить повторно
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-requests">
                <p>Нет заявок с выбранным статусом</p>
              </div>
            )}
          </div>
        )}
      </div>

      {state.selectedRequest && (
        <div className="request-modal">
          <div className="modal-content">
            <button className="close-modal" onClick={closeRequestDetails}>
              &times;
            </button>
            <h2>Детали заявки</h2>
            <div className="modal-details">
              <p>
                <strong>ID заявки:</strong> 
                <span className="modal-id">
                  {state.selectedRequest.id}
                  <button 
                    className="copy-id-btn"
                    onClick={() => copyToClipboard(state.selectedRequest.id)}
                    title="Копировать ID"
                  >
                    <FaCopy />
                    {state.copiedId === state.selectedRequest.id && <span className="copied-tooltip">Скопировано!</span>}
                  </button>
                </span>
              </p>
              <p><strong>ФИО:</strong> {state.selectedRequest.fullName}</p>
              <p><strong>Документ:</strong> {state.selectedRequest.docType} {state.selectedRequest.docNumber}</p>
              <p><strong>Email:</strong> {state.selectedRequest.email}</p>
              <p><strong>Период:</strong> {new Date(state.selectedRequest.startDate).toLocaleDateString()} -{' '}
                {new Date(state.selectedRequest.endDate).toLocaleDateString()}</p>
              {state.selectedRequest.rejectionReason && (
                <p><strong>Причина отказа:</strong> {state.selectedRequest.rejectionReason}</p>
              )}
              <p><strong>Статус:</strong> 
                <span style={{ color: STATUSES[state.selectedRequest.status]?.color }}>
                  {STATUSES[state.selectedRequest.status]?.label}
                </span>
              </p>
              <p><strong>Дата создания:</strong> {state.selectedRequest.createdAt?.toLocaleString()}</p>
              {state.selectedRequest.approvedAt && (
                <p><strong>Дата одобрения:</strong> {state.selectedRequest.approvedAt?.toLocaleString()}</p>
              )}
              {state.selectedRequest.rejectedAt && (
                <p><strong>Дата отклонения:</strong> {state.selectedRequest.rejectedAt?.toLocaleString()}</p>
              )}
            </div>
            <div className="modal-actions">
              {state.selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleRequestAction('approve', state.selectedRequest);
                      closeRequestDetails();
                    }}
                    className="approve-button"
                  >
                    <FaCheck /> Одобрить
                  </button>
                  <button
                    onClick={() => {
                      handleRequestAction('reject', state.selectedRequest);
                      closeRequestDetails();
                    }}
                    className="reject-button"
                  >
                    <FaTimes /> Отклонить
                  </button>
                </>
              )}
              {state.selectedRequest.status === 'rejected' && (
                <button
                  onClick={() => {
                    handleRequestAction('approve', state.selectedRequest);
                    closeRequestDetails();
                  }}
                  className="approve-button"
                >
                  <FaUndo /> Одобрить повторно
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {state.selectedPassRequest && (
        <div className="request-modal">
          <div className="modal-content">
            <button className="close-modal" onClick={closeRequestDetails}>
              &times;
            </button>
            <h2>Детали запроса на пропуск</h2>
            <div className="modal-details">
              <p>
                <strong>ID запроса:</strong> 
                <span className="modal-id">
                  {state.selectedPassRequest.id}
                  <button 
                    className="copy-id-btn"
                    onClick={() => copyToClipboard(state.selectedPassRequest.id)}
                    title="Копировать ID"
                  >
                    <FaCopy />
                    {state.copiedId === state.selectedPassRequest.id && <span className="copied-tooltip">Скопировано!</span>}
                  </button>
                </span>
              </p>
              <p><strong>ФИО:</strong> {state.selectedPassRequest.fullName}</p>
              <p><strong>Документ:</strong> {state.selectedPassRequest.docType} {state.selectedPassRequest.docNumber}</p>
              <p><strong>Email:</strong> {state.selectedPassRequest.email}</p>
              <p><strong>Период:</strong> {new Date(state.selectedPassRequest.startDate).toLocaleDateString()} -{' '}
                {new Date(state.selectedPassRequest.endDate).toLocaleDateString()}</p>
              <p><strong>Статус:</strong> 
                <span style={{ color: PASS_STATUSES[state.selectedPassRequest.status]?.color }}>
                  {PASS_STATUSES[state.selectedPassRequest.status]?.label}
                </span>
              </p>
              <p><strong>Дата создания:</strong> {state.selectedPassRequest.createdAt?.toLocaleString()}</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  handlePassRequestAction('approve', state.selectedPassRequest);
                  closeRequestDetails();
                }}
                className="approve-button"
              >
                <FaCheck /> Одобрить
              </button>
              <button
                onClick={() => {
                  handlePassRequestAction('reject', state.selectedPassRequest);
                  closeRequestDetails();
                }}
                className="reject-button"
              >
                <FaTimes /> Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}