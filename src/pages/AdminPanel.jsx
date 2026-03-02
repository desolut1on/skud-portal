import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  addDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import {
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaUsers,
  FaListAlt,
  FaUserShield,
  FaUserCog,
  FaIdCard,
  FaSignOutAlt,
  FaCheck,
  FaTimes,
  FaSearch,
  FaExclamationTriangle,
  FaUndo,
  FaCopy,
  FaUserPlus
} from 'react-icons/fa';
import './AdminPanel.css';

const STATUSES = {
  pending: { label: 'Ожидающие', icon: <FaUserClock />, color: '#FFA500' },
  approved: { label: 'Одобренные', icon: <FaUserCheck />, color: '#4CAF50' },
  rejected: { label: 'Отклоненные', icon: <FaUserTimes />, color: '#F44336' }
};

export default function AdminPanel() {
  const { 
    currentUser, 
    logout
  } = useAuth();
  
  const [state, setState] = useState({
    activeTab: 'guestRequests',
    guestRequests: [],
    registrationRequests: [],
    users: [],
    operators: [],
    newOperatorEmail: '',
    loading: true,
    error: null,
    successMessage: null,
    searchTerm: '',
    selectedRequest: null,
    copiedId: null,
    guestRequestsTab: 'pending'
  });

  const parseFirestoreDate = (timestamp) => {
    if (!timestamp) return null;
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  };

  useEffect(() => {
    if (!currentUser) return;

    // Подписка на гостевые заявки
    const unsubscribeGuestRequests = onSnapshot(
      state.guestRequestsTab === 'all' 
        ? query(collection(db, 'guest_requests'))
        : query(collection(db, 'guest_requests'), where('status', '==', state.guestRequestsTab)),
      (snapshot) => {
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: parseFirestoreDate(data.createdAt),
            approvedAt: parseFirestoreDate(data.approvedAt),
            rejectedAt: parseFirestoreDate(data.rejectedAt)
          };
        });
        setState(prev => ({ ...prev, guestRequests: requests }));
      }
    );

    // Подписка на запросы регистрации
    const unsubscribeRegRequests = onSnapshot(
      query(collection(db, 'registration_requests')),
      (snapshot) => {
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: parseFirestoreDate(data.createdAt)
          };
        });
        setState(prev => ({ ...prev, registrationRequests: requests }));
      }
    );

    // Подписка на пользователей
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: parseFirestoreDate(doc.data().createdAt)
        }));
        setState(prev => ({ 
          ...prev, 
          users: usersData,
          operators: usersData.filter(user => user.role === 'operator'),
          loading: false
        }));
      }
    );

    return () => {
      unsubscribeGuestRequests();
      unsubscribeRegRequests();
      unsubscribeUsers();
    };
  }, [currentUser, state.guestRequestsTab]);

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
        updateData.rejectionReason = 'Отклонено администратором';
      }

      await updateDoc(doc(db, 'guest_requests', request.id), updateData);

      if (action === 'approve') {
        await createSkudRegistration(request);
      }

      setState(prev => ({
        ...prev,
        successMessage: action === 'approve' 
          ? 'Заявка успешно одобрена' 
          : 'Заявка отклонена',
        loading: false
      }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      setState(prev => ({
        ...prev,
        error: `Ошибка при ${action === 'approve' ? 'одобрении' : 'отклонении'} заявки`,
        loading: false
      }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const handleReapproveRequest = async (request) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const batch = writeBatch(db);
      
      const requestRef = doc(db, 'guest_requests', request.id);
      batch.update(requestRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null
      });

      await createSkudRegistration(request);
      await batch.commit();
      
      setState(prev => ({
        ...prev,
        successMessage: 'Отклоненная заявка успешно одобрена',
        loading: false
      }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error('Error reapproving request:', error);
      setState(prev => ({
        ...prev,
        error: 'Ошибка при повторном одобрении заявки',
        loading: false
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

  const handleApproveRegistration = async (requestId) => {
    try {
      await updateDoc(doc(db, 'registration_requests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid
      });
      setState(prev => ({ ...prev, successMessage: 'Регистрация одобрена' }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error('Ошибка при одобрении регистрации:', error);
      setState(prev => ({ ...prev, error: 'Ошибка при одобрении регистрации' }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const handleRejectRegistration = async (requestId) => {
    try {
      await updateDoc(doc(db, 'registration_requests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid
      });
      setState(prev => ({ ...prev, successMessage: 'Регистрация отклонена' }));
      setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
    } catch (error) {
      console.error('Ошибка при отклонении регистрации:', error);
      setState(prev => ({ ...prev, error: 'Ошибка при отклонении регистрации' }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const addOperator = async () => {
    if (!state.newOperatorEmail) return;

    try {
      const rolesDocRef = doc(db, 'system', 'roles');
      const rolesDoc = await getDoc(rolesDocRef);

      let currentOperators = [];
      if (rolesDoc.exists()) {
        currentOperators = rolesDoc.data().operators || [];
      }

      if (!currentOperators.includes(state.newOperatorEmail)) {
        await setDoc(rolesDocRef, {
          operators: [...currentOperators, state.newOperatorEmail],
        }, { merge: true });

        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', state.newOperatorEmail)
        );
        const snapshot = await getDocs(userQuery);

        if (!snapshot.empty) {
          const userDocRef = doc(db, 'users', snapshot.docs[0].id);
          await updateDoc(userDocRef, {
            role: 'operator',
            approved: true,
          });
        }
        setState(prev => ({ 
          ...prev, 
          newOperatorEmail: '',
          successMessage: 'Оператор успешно добавлен'
        }));
        setTimeout(() => setState(prev => ({ ...prev, successMessage: null })), 3000);
      } else {
        setState(prev => ({ ...prev, error: 'Этот email уже добавлен в операторы' }));
        setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
      }
    } catch (error) {
      console.error('Ошибка добавления оператора:', error);
      setState(prev => ({ ...prev, error: 'Ошибка добавления оператора' }));
      setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const filteredGuestRequests = state.guestRequests.filter(request => 
    ['fullName', 'email', 'docNumber', 'id'].some(field =>
      request[field]?.toString().toLowerCase().includes(state.searchTerm.toLowerCase())
    )
  );

  const filteredRegistrationRequests = state.registrationRequests.filter(request => 
    request.status === 'pending' &&
    ['name', 'email', 'id'].some(field =>
      request[field]?.toString().toLowerCase().includes(state.searchTerm.toLowerCase())
    )
  );

  const openRequestDetails = (request) => {
    setState(prev => ({ ...prev, selectedRequest: request }));
  };

  const closeRequestDetails = () => {
    setState(prev => ({ ...prev, selectedRequest: null }));
  };

  if (state.loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1><FaUserShield /> Панель администратора</h1>
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

      <div className="admin-tabs">
        <button
          className={`tab-btn ${state.activeTab === 'guestRequests' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'guestRequests' }))}
        >
          <FaIdCard /> Гостевые заявки ({state.guestRequests.length})
        </button>
        <button
          className={`tab-btn ${state.activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'registrations' }))}
        >
          <FaListAlt /> Регистрации ({filteredRegistrationRequests.length})
        </button>
        <button
          className={`tab-btn ${state.activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'users' }))}
        >
          <FaUsers /> Пользователи ({state.users.length})
        </button>
        <button
          className={`tab-btn ${state.activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activeTab: 'operators' }))}
        >
          <FaUserCog /> Операторы ({state.operators.length})
        </button>
      </div>

      <div className="admin-content">
        {state.activeTab === 'guestRequests' && (
          <div className="requests-section">
            <div className="requests-header">
              <div className="requests-tabs">
                {Object.entries(STATUSES).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    className={`subtab-btn ${state.guestRequestsTab === key ? 'active' : ''}`}
                    onClick={() => setState(prev => ({ ...prev, guestRequestsTab: key }))}
                  >
                    {icon} {label}
                  </button>
                ))}
                <button
                  className={`subtab-btn ${state.guestRequestsTab === 'all' ? 'active' : ''}`}
                  onClick={() => setState(prev => ({ ...prev, guestRequestsTab: 'all' }))}
                >
                  <FaListAlt /> Все заявки
                </button>
              </div>
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
            
            {filteredGuestRequests.length > 0 ? (
              <div className="requests-grid">
                {filteredGuestRequests.map(request => (
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
                            <FaUserTimes /> Отклонено: {request.rejectedAt?.toLocaleDateString()}
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
                            className="btn-approve"
                          >
                            <FaCheck /> Одобрить
                          </button>
                          <button
                            onClick={() => handleRequestAction('reject', request)}
                            className="btn-reject"
                          >
                            <FaTimes /> Отклонить
                          </button>
                        </>
                      )}
                      {request.status === 'rejected' && (
                        <button
                          onClick={() => handleReapproveRequest(request)}
                          className="btn-approve"
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

        {state.activeTab === 'registrations' && (
          <div className="requests-section">
            <h2><FaUserClock /> Ожидающие регистрации</h2>
            {filteredRegistrationRequests.length === 0 ? (
              <p className="no-requests">Нет ожидающих регистраций</p>
            ) : (
              <div className="requests-grid">
                {filteredRegistrationRequests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h3>{request.name}</h3>
                      <span className="request-date">
                        {request.createdAt?.toLocaleDateString() || 'Дата не указана'}
                      </span>
                    </div>
                    <div className="request-body">
                      <p><strong>Email:</strong> {request.email}</p>
                    </div>
                    <div className="request-actions">
                      <button
                        onClick={() => handleApproveRegistration(request.id)}
                        className="btn-approve"
                      >
                        <FaUserCheck /> Одобрить
                      </button>
                      <button
                        onClick={() => handleRejectRegistration(request.id)}
                        className="btn-reject"
                      >
                        <FaUserTimes /> Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.activeTab === 'users' && (
          <div className="users-section">
            <h2><FaUsers /> Все пользователи</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Документ</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name || user.fullName || '-'}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === 'admin' ? 'Админ' : 
                           user.role === 'operator' ? 'Оператор' : 
                           user.role === 'guest' ? 'Гость' : 'Сотрудник'}
                        </span>
                      </td>
                      <td>
                        {user.docType ? `${user.docType} ${user.docNumber}` : '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${user.approved ? 'approved' : 'pending'}`}>
                          {user.approved ? 'Активен' : 'Ожидает'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {state.activeTab === 'operators' && (
          <div className="operators-section">
            <h2><FaUserCog /> Управление операторами</h2>
            <div className="add-operator">
              <input
                type="email"
                value={state.newOperatorEmail}
                onChange={(e) => setState(prev => ({ ...prev, newOperatorEmail: e.target.value }))}
                placeholder="Email нового оператора"
              />
              <button onClick={addOperator} className="btn-add">
                Добавить оператора
              </button>
            </div>
            <div className="operators-list">
              {state.operators.length === 0 ? (
                <p>Нет зарегистрированных операторов</p>
              ) : (
                <div className="operators-grid">
                  {state.operators.map(op => (
                    <div key={op.id} className="operator-card">
                      <div className="operator-info">
                        <h3>{op.name || op.email}</h3>
                        <p>{op.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              {state.selectedRequest.startDate && (
                <p><strong>Период:</strong> {new Date(state.selectedRequest.startDate).toLocaleDateString()} -{' '}
                  {new Date(state.selectedRequest.endDate).toLocaleDateString()}</p>
              )}
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
                    className="btn-approve"
                  >
                    <FaCheck /> Одобрить
                  </button>
                  <button
                    onClick={() => {
                      handleRequestAction('reject', state.selectedRequest);
                      closeRequestDetails();
                    }}
                    className="btn-reject"
                  >
                    <FaTimes /> Отклонить
                  </button>
                </>
              )}
              {state.selectedRequest.status === 'rejected' && (
                <button
                  onClick={() => {
                    handleReapproveRequest(state.selectedRequest);
                    closeRequestDetails();
                  }}
                  className="btn-approve"
                >
                  <FaUndo /> Одобрить повторно
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}