import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/api';

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/', roles: [UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN] },
  { label: 'Clientes', path: '/customers', roles: [UserRole.ADMIN] },
  {
    label: 'Barbeiros',
    path: '/barbers',
    roles: [UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN],
  },
  {
    label: 'Serviços',
    path: '/services',
    roles: [UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN],
  },
  {
    label: 'Agendamentos',
    path: '/appointments',
    roles: [UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN],
  },
  { label: 'Transações', path: '/transactions', roles: [UserRole.ADMIN] },
  { label: 'Usuários', path: '/users', roles: [UserRole.ADMIN] },
];

export function AppLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <NavLink to="/" style={styles.logo}>
            BarberLab
          </NavLink>
        </div>
        <nav style={styles.nav}>
          {navigation
            .filter(item => {
              if (!user) return false;
              if (item.roles.includes(UserRole.ADMIN)) return true;
              return item.roles.includes(user.role);
            })
            .map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                })}
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div style={styles.userMenu}>
          <span style={styles.userInfo}>
            {user?.name} ({user?.role})
          </span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sair
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-md) var(--spacing-xl)',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  navLink: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    color: 'var(--color-text)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  navLinkActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  userInfo: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  logoutButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
  },
  main: {
    flex: 1,
    padding: 'var(--spacing-xl)',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
};
