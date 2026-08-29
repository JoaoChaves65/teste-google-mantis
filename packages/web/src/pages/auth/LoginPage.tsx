import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { env } from '../../config/env';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const error = err as Error & { status?: number; code?: string };
      if (error.status === 401) {
        setError('Email ou senha inválidos');
      } else if (error.code === 'ACCOUNT_INACTIVE') {
        setError('Conta inativa. Entre em contato com o administrador.');
      } else if (error.status === 429) {
        setError('Muitas tentativas. Tente novamente em alguns minutos.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.title}>{env.VITE_APP_TITLE}</h1>
          <p style={styles.subtitle}>Entre na sua conta</p>
        </header>

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              style={styles.input}
              disabled={isLoading}
              aria-describedby="email-hint"
            />
            <span id="email-hint" style={styles.hint}>
              Use o email cadastrado no sistema
            </span>
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={styles.input}
              disabled={isLoading}
            />
          </div>

          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? (
              <>
                <span style={styles.spinner} />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <footer style={styles.footer}>
          <p style={styles.footerText}>BarberLab Security Lab — Acesso autorizado apenas</p>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl)',
    backgroundColor: 'var(--color-background)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-xl)',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--spacing-xl)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    marginBottom: 'var(--spacing-xs)',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    color: '#991b1b',
    fontSize: '0.875rem',
    marginBottom: 'var(--spacing-lg)',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text)',
  },
  input: {
    padding: 'var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface)',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), opacity var(--transition-fast)',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  footer: {
    marginTop: 'var(--spacing-xl)',
    paddingTop: 'var(--spacing-lg)',
    borderTop: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
};
