import { env } from '../config/env';

export function HomePage(): JSX.Element {
  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{env.VITE_APP_TITLE}</h1>
        <p style={styles.subtitle}>Security Lab Educational Project</p>
      </header>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Status</h2>
        <div style={styles.statusGrid}>
          <StatusCard title="Frontend" status="running" description="React + TypeScript + Vite" />
          <StatusCard
            title="API Secure"
            status="configured"
            description="Express 5 + TypeScript (port 3001)"
          />
          <StatusCard
            title="API Vulnerable"
            status="configured"
            description="Placeholder structure (port 3002)"
          />
        </div>
      </section>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About</h2>
        <p style={styles.description}>
          BarberLab is an educational Security Lab project. It consists of two variants:
        </p>
        <ul style={styles.list}>
          <li>
            <strong>SECURE</strong> — Application with proper security practices
          </li>
          <li>
            <strong>VULNERABLE</strong> — Controlled vulnerabilities for security testing
          </li>
        </ul>
        <p style={styles.warning}>
          ⚠️ The VULNERABLE variant must never be exposed to the Internet. This project is for
          authorized security testing in isolated environments only.
        </p>
      </section>
      <footer style={styles.footer}>
        <p>Version 0.1.0 — Foundation Stage</p>
      </footer>
    </main>
  );
}

interface StatusCardProps {
  title: string;
  status: 'running' | 'configured' | 'planned';
  description: string;
}

function StatusCard({ title, status, description }: StatusCardProps): JSX.Element {
  const statusColors = {
    running: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    configured: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    planned: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  };

  const colors = statusColors[status];

  return (
    <div style={{ ...styles.card, borderColor: colors.border }}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <span style={{ ...styles.badge, backgroundColor: colors.bg, color: colors.text }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
      <p style={styles.cardDescription}>{description}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--spacing-xl)',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--spacing-xl)',
    paddingBottom: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    marginBottom: 'var(--spacing-xs)',
  },
  subtitle: {
    fontSize: '1.125rem',
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
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--spacing-md)',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-lg)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 'var(--spacing-sm)',
  },
  badge: {
    display: 'inline-block',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: 'var(--spacing-sm)',
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  description: {
    marginBottom: 'var(--spacing-md)',
    color: 'var(--color-text)',
  },
  list: {
    marginLeft: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-md)',
    color: 'var(--color-text)',
  },
  warning: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    color: '#991b1b',
    fontSize: '0.875rem',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 'var(--spacing-lg)',
    borderTop: '1px solid var(--color-border)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
};
