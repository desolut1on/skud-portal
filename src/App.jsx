import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './pages/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import './assets/styles/global.css';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import LoadingSpinner from './сomponents/LoadingSpinner';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-fallback" role="alert">
      <h2>Произошла ошибка</h2>
      <pre className="error-message">{error.message}</pre>
      <div className="error-actions">
        <button 
          className="btn-retry" 
          onClick={resetErrorBoundary}
        >
          Повторить попытку
        </button>
        <button 
          className="btn-home"
          onClick={() => window.location.href = '/'}
        >
          На главную
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner fullPage />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}