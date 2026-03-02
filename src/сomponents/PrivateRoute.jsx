import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../сomponents/LoadingSpinner';

const roles = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  EMPLOYEE: 'employee'
};

export default function PrivateRoute({ children, requiredRoles }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRoles) {
    const hasRequiredRole = requiredRoles.some(role => {
      switch(role) {
        case roles.ADMIN: return currentUser.isAdmin;
        case roles.OPERATOR: return currentUser.isOperator;
        case roles.EMPLOYEE: return currentUser.isEmployee;
        default: return false;
      }
    });

    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}