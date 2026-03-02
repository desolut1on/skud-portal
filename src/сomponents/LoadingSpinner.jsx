import { FaSpinner } from 'react-icons/fa';
import PropTypes from 'prop-types';
import './LoadingSpinner.css';

export default function LoadingSpinner({ fullPage = false }) {
  return (
    <div className={`spinner-container ${fullPage ? 'full-page' : ''}`}>
      <FaSpinner className="spinner-icon" />
      <span>Загрузка...</span>
    </div>
  );
}

LoadingSpinner.propTypes = {
  fullPage: PropTypes.bool
};