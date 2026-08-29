import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (user?.role === UserRole.ADMIN) {
      return <>{children}</>;
    }

    if (!user?.role || !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

interface RoleRouteProps {
  children: React.ReactNode;
  roles: UserRole[];
}

export function RoleRoute({ children, roles }: RoleRouteProps): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === UserRole.ADMIN) {
    return <>{children}</>;
  }

  if (user?.role && roles.includes(user.role)) {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 'var(--spacing-md)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'var(--color-text-muted)',
  },
};

if (typeof document !== 'undefined' && !document.querySelector('#loading-spinner-style')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'loading-spinner-style';
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
