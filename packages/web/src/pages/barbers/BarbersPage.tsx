import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type { Barber } from '../../types/api';

export function BarbersPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  const canManage = hasRole(UserRole.ADMIN);

  const loadBarbers = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getBarbers({ page, limit: 10 });
      setBarbers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar barbeiros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, [page]);

  const handleCreate = async (data: {
    name: string;
    phone: string;
    specialty: string;
    hireDate: string;
  }): Promise<void> => {
    await api.createBarber(data);
    setShowModal(false);
    loadBarbers();
  };

  const handleUpdate = async (
    id: string,
    data: { name?: string; phone?: string; specialty?: string; hireDate?: string; active?: boolean }
  ): Promise<void> => {
    await api.updateBarber(id, data);
    setShowModal(false);
    loadBarbers();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      specialty: formData.get('specialty') as string,
      hireDate: formData.get('hireDate') as string,
      active: formData.get('active') === 'on',
    };
    try {
      if (editingBarber) {
        await handleUpdate(editingBarber.id, data);
      } else {
        await handleCreate(data);
      }
    } catch {
      // Error handled by form submission
    }
  };

  const openCreateModal = (): void => {
    setEditingBarber(null);
    setShowModal(true);
  };

  const openEditModal = (barber: Barber): void => {
    setEditingBarber(barber);
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingBarber(null);
  };

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
      <React.Fragment>
        <div style={styles.error} role="alert">
          {error}
        </div>
      </React.Fragment>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Barbeiros</h1>
        {canManage && (
          <button onClick={openCreateModal} style={styles.primaryButton}>
            Novo Barbeiro
          </button>
        )}
      </header>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      <React.Fragment>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableRow}>
                <th style={styles.tableCell}>Nome</th>
                <th style={styles.tableCell}>Telefone</th>
                <th style={styles.tableCell}>Especialidade</th>
                <th style={styles.tableCell}>Data Admissão</th>
                <th style={styles.tableCell}>Status</th>
                <th style={styles.tableCell}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {barbers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Nenhum barbeiro encontrado
                  </td>
                </tr>
              ) : (
                barbers.map(barber => (
                  <tr key={barber.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{barber.name}</strong>
                    </td>
                    <td style={styles.tableCell}>{barber.phone || '-'}</td>
                    <td style={styles.tableCell}>{barber.specialty || '-'}</td>
                    <td style={styles.tableCell}>
                      {barber.hireDate
                        ? new Date(barber.hireDate).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: barber.active ? '#dcfce7' : '#fef2f2',
                          color: barber.active ? '#166534' : '#991b1b',
                          borderColor: barber.active ? '#86efac' : '#fecaca',
                        }}
                      >
                        {barber.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        {canManage && (
                          <button onClick={() => openEditModal(barber)} style={styles.actionButton}>
                            Editar
                          </button>
                        )}
                      </div>
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

      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <header style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>
                ×
              </button>
            </header>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formField}>
                <label htmlFor="name" style={styles.label}>
                  Nome *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={editingBarber?.name || ''}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="phone" style={styles.label}>
                  Telefone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  defaultValue={editingBarber?.phone || ''}
                  required
                  placeholder="(11) 99999-9999"
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="specialty" style={styles.label}>
                  Especialidade *
                </label>
                <input
                  type="text"
                  id="specialty"
                  name="specialty"
                  defaultValue={editingBarber?.specialty || ''}
                  required
                  placeholder="Ex: Corte clássico, Barba, etc."
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="hireDate" style={styles.label}>
                  Data de Admissão *
                </label>
                <input
                  type="date"
                  id="hireDate"
                  name="hireDate"
                  defaultValue={editingBarber?.hireDate || ''}
                  required
                  style={styles.input}
                />
              </div>
              {editingBarber && (
                <div style={styles.formField}>
                  <label style={styles.label}>Status</label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={editingBarber.active}
                      style={styles.checkbox}
                    />
                    <span style={styles.checkboxText}>Ativo</span>
                  </label>
                </div>
              )}
              <div style={styles.formActions}>
                <button type="button" onClick={closeModal} style={styles.secondaryButton}>
                  Cancelar
                </button>
                <button type="submit" style={styles.primaryButton}>
                  {editingBarber ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 'var(--spacing-md) 0' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' },
  primaryButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  tableContainer: {
    overflowX: 'auto' as const,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableRow: { borderBottom: '1px solid var(--color-border)' },
  tableCell: { padding: 'var(--spacing-md)', textAlign: 'left' as const },
  emptyCell: {
    textAlign: 'center' as const,
    color: 'var(--color-text-muted)',
    padding: 'var(--spacing-xl)',
  },
  actions: { display: 'flex', gap: 'var(--spacing-sm)' },
  actionButton: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontSize: '0.8125rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  statusBadge: {
    display: 'inline-block',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
    padding: 'var(--spacing-md)',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    color: '#991b1b',
    marginBottom: 'var(--spacing-lg)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-md)',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border)',
  },
  modalTitle: { fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    lineHeight: 1,
  },
  form: { padding: 'var(--spacing-lg)' },
  formField: { marginBottom: 'var(--spacing-md)' },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: 'var(--spacing-xs)',
  },
  input: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    boxSizing: 'border-box' as const,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--color-primary)',
  },
  checkboxText: {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
  },
};
