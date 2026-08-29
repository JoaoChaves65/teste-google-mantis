import { useState, useEffect } from 'react';
import React from 'react';
import { api } from '../../lib/api/client';
import type { User, UserRole } from '../../types/api';

export function UsersPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadUsers = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getUsers({ page, limit: 10 });
      setUsers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const getRoleBadge = (role: UserRole): React.CSSProperties => {
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <React.Fragment>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
          </div>
        </React.Fragment>
      );
    }

    if (error) {
      return (
        <div style={styles.error} role="alert">
          {error}
        </div>
      );
    }

    return (
      <React.Fragment>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableRow}>
                <th style={styles.tableCell}>Nome</th>
                <th style={styles.tableCell}>Email</th>
                <th style={styles.tableCell}>Role</th>
                <th style={styles.tableCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyCell}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{user.name}</strong>
                    </td>
                    <td style={styles.tableCell}>{user.email}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.roleBadge,
                          ...getRoleBadge(user.role),
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: user.status === 'ACTIVE' ? '#dcfce7' : '#fef2f2',
                          color: user.status === 'ACTIVE' ? '#166534' : '#991b1b',
                          borderColor: user.status === 'ACTIVE' ? '#86efac' : '#fecaca',
                        }}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </button>
          <span>
            Página {page} de {totalPages} ({total} total)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </button>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Usuários</h1>
      </header>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {renderContent()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 'var(--spacing-md) 0' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing_xl)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color_border)',
    borderTopColor: 'var(--color_primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'var(--color_surface)',
    border: '1px solid var(--color_border)',
    borderRadius: 'var(--radius_lg)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableRow: { borderBottom: '1px solid var(--color_border)' },
  tableCell: { padding: 'var(--spacing_md)', textAlign: 'left' },
  emptyCell: {
    textAlign: 'center',
    color: 'var(--color_text_muted)',
    padding: 'var(--spacing_xl)',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing_md)',
    marginTop: 'var(--spacing_lg)',
    padding: 'var(--spacing_md)',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing_xs) var(--spacing_sm)',
    borderRadius: 'var(--radius_sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing_xs) var(--spacing_sm)',
    borderRadius: 'var(--radius_sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius_md)',
    padding: 'var(--spacing_md)',
    color: '#991b1b',
    marginBottom: 'var(--spacing_lg)',
  },
};
