import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/api';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();

  const getRoleBadgeColor = (role: UserRole): React.CSSProperties => {
    switch (role) {
      case 'ADMIN':
        return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
      case 'BARBER':
        return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
      case 'CUSTOMER':
        return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
      default:
        return {
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
        };
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={styles.userBadge}>
          <span style={{ ...styles.badge, ...getRoleBadgeColor(user?.role || UserRole.CUSTOMER) }}>
            {user?.role}
          </span>
          <span style={styles.welcome}>Bem-vindo, {user?.name}</span>
        </div>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Visão Geral</h2>
        <div style={styles.notice}>
          <p>Endpoints de estatísticas/relatórios ainda não estão disponíveis na API v1.</p>
          <p>Use o menu lateral para acessar as funcionalidades disponíveis.</p>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Acesso Rápido</h2>
        <div style={styles.cards}>
          {[
            {
              title: 'Meus Agendamentos',
              path: '/appointments',
              roles: ['CUSTOMER', 'BARBER', 'ADMIN'] as const,
            },
            {
              title: 'Serviços',
              path: '/services',
              roles: ['CUSTOMER', 'BARBER', 'ADMIN'] as const,
            },
            {
              title: 'Barbeiros',
              path: '/barbers',
              roles: ['CUSTOMER', 'BARBER', 'ADMIN'] as const,
            },
            { title: 'Clientes', path: '/customers', roles: ['ADMIN'] as const },
            { title: 'Transações', path: '/transactions', roles: ['ADMIN'] as const },
            { title: 'Usuários', path: '/users', roles: ['ADMIN'] as const },
          ].map(item => (
            <div key={item.title} style={styles.card}>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardDescription}>
                {'Acesse a página para gerenciar ' + item.title.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-xl)',
    paddingBottom: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  welcome: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
  },
  section: {
    marginBottom: 'var(--spacing-xl)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: 'var(--spacing-md)',
    color: 'var(--color-text)',
  },
  notice: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-lg)',
    color: 'var(--color-text-muted)',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'var(--spacing-md)',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-lg)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--spacing-sm)',
    color: 'var(--color-text)',
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
};
