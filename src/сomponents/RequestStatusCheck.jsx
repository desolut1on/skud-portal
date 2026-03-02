import { useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import Modal from './Modal/Modal';
import './RequestStatusCheck.css';

export default function RequestStatusCheck() {
  const [requestId, setRequestId] = useState('');
  const [requestData, setRequestData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const checkStatus = async () => {
    const trimmedId = requestId.trim().toUpperCase();
    if (!trimmedId) {
      setError('Введите номер заявки');
      return;
    }

    setLoading(true);
    setError('');
    setRequestData(null);

    try {
      // Ищем в обеих коллекциях
      const collections = ['guest_requests', 'guest_passes'];
      let foundRequest = null;

      for (const col of collections) {
        const q = query(
          collection(db, col),
          where('requestNumber', '==', trimmedId),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          foundRequest = {
            id: doc.id,
            collection: col,
            ...doc.data()
          };
          break;
        }
      }

      if (foundRequest) {
        formatRequestData(foundRequest);
      } else {
        setError(`Заявка ${trimmedId} не найдена`);
      }
    } catch (err) {
      console.error('Ошибка проверки:', err);
      setError('Ошибка при проверке статуса. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const formatRequestData = (request) => {
    const formatDate = (date) => {
      if (!date) return 'Не указана';
      if (date.toDate) return date.toDate().toLocaleString('ru-RU');
      return new Date(date).toLocaleString('ru-RU');
    };

    const statusText = {
      active: 'Активен',
      approved: 'Одобрен',
      pending: 'На рассмотрении',
      rejected: 'Отклонен'
    }[request.status] || 'Неизвестный статус';

    setRequestData({
      ...request,
      statusText,
      createdAt: formatDate(request.createdAt),
      approvedAt: formatDate(request.approvedAt),
      rejectedAt: formatDate(request.rejectedAt),
      startDate: request.startDate || 'Не указана',
      endDate: request.endDate || 'Не указана',
      docType: request.docType || 'Не указан',
      docNumber: request.docNumber || 'Не указан'
    });
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="status-check-btn"
      >
        Проверить статус заявки
      </button>

      {showModal && (
        <Modal onClose={() => {
          setShowModal(false);
          setRequestData(null);
          setError('');
        }}>
          <div className="request-status-container">
            <h2>Проверка статуса заявки</h2>
            
            <div className="input-group">
              <input
                type="text"
                value={requestId}
                onChange={(e) => {
                  setRequestId(e.target.value);
                  setError('');
                }}
                placeholder="Введите номер заявки (например: REQ-MBCMOZH2)"
                disabled={loading}
              />
              <button 
                onClick={checkStatus} 
                disabled={loading || !requestId.trim()}
                className="check-btn"
              >
                {loading ? 'Проверка...' : 'Проверить'}
              </button>
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️</span> {error}
              </div>
            )}

            {requestData && (
              <div className="status-details">
                <div className="status-header">
                  <h3>Заявка #{requestData.requestNumber || requestData.id}</h3>
                  <span className={`status-badge ${requestData.status}`}>
                    {requestData.statusText}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span>ФИО:</span>
                  <span>{requestData.fullName}</span>
                </div>
                
                <div className="detail-row">
                  <span>Документ:</span>
                  <span>{requestData.docType} {requestData.docNumber}</span>
                </div>
                
                <div className="detail-row">
                  <span>Дата создания:</span>
                  <span>{requestData.createdAt}</span>
                </div>
                
                {requestData.approvedAt && (
                  <div className="detail-row">
                    <span>Дата одобрения:</span>
                    <span>{requestData.approvedAt}</span>
                  </div>
                )}
                
                {requestData.rejectedAt && (
                  <div className="detail-row">
                    <span>Дата отклонения:</span>
                    <span>{requestData.rejectedAt}</span>
                  </div>
                )}
                
                <div className="detail-row">
                  <span>Период доступа:</span>
                  <span>{requestData.startDate} — {requestData.endDate}</span>
                </div>
                
                {requestData.rejectionReason && (
                  <div className="detail-row">
                    <span>Причина отклонения:</span>
                    <span>{requestData.rejectionReason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}