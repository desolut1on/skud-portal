import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../сomponents/LoadingSpinner';

// Lazy-loaded components
const Home = lazy(() => import('./Home'));
const Login = lazy(() => import('./Login'));
const RegisterForm = lazy(() => import('../сomponents/Auth/RegisterForm'));
const RegisterSuccess = lazy(() => import('./RegisterSuccess'));
const GuestForm = lazy(() => import('../сomponents/Auth/GuestForm'));
const PrivateRoute = lazy(() => import('../сomponents/PrivateRoute'));
const EmployeePanel = lazy(() => import('./EmployeePanel'));
const OperatorPanel = lazy(() => import('./OperatorPanel'));
const AdminPanel = lazy(() => import('./AdminPanel'));

export default function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={currentUser ? <Navigate to="/" replace /> : <RegisterForm />} 
        />
        <Route path="/register-success" element={<RegisterSuccess />} />
        <Route path="/guest" element={<GuestForm />} />
        
        {/* Protected routes */}
        <Route 
          path="/admin/*" 
          element={
            <PrivateRoute requiredRoles={['admin']}>
              <AdminPanel />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/operator/*" 
          element={
            <PrivateRoute requiredRoles={['operator']}>
              <OperatorPanel />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/employee/*" 
          element={
            <PrivateRoute requiredRoles={['employee']}>
              <EmployeePanel />
            </PrivateRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}