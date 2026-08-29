import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type { Customer } from '../../types/api';

export function CustomersPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const canCreate = hasRole(UserRole.ADMIN) || hasRole(UserRole.BARBER);
  const canEdit = hasRole(UserRole.ADMIN) || hasRole(UserRole.BARBER);
  const canDelete = hasRole(UserRole.ADMIN);

  const loadCustomers = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getCustomers({ page, limit: 10 });
      setCustomers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page]);

  const handleCreate = async (data: {
    name: string;
    phone: string;
    email?: string;
    birthDate?: string;
    notes?: string;
  }): Promise<void> => {
    await api.createCustomer(data);
    setShowModal(false);
    loadCustomers();
  };

  const handleUpdate = async (
    id: string,
    data: { name?: string; phone?: string; email?: string; birthDate?: string; notes?: string }
  ): Promise<void> => {
    await api.updateCustomer(id, data);
    setShowModal(false);
    loadCustomers();
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.deleteCustomer(id);
      loadCustomers();
    } catch {
      setError('Erro ao excluir cliente');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || undefined,
      birthDate: (formData.get('birthDate') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    };
    try {
      if (editingCustomer) {
        await handleUpdate(editingCustomer.id, data);
      } else {
        await handleCreate(data);
      }
    } catch {
      // Error handled by form submission
    }
  };

  const openCreateModal = (): void => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const openEditModal = (customer: Customer): void => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingCustomer(null);
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
        <h1 style={styles.title}>Clientes</h1>
        {canCreate && (
          <button onClick={openCreateModal} style={styles.primaryButton}>
            Novo Cliente
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
                <th style={styles.tableCell}>Email</th>
                <th style={styles.tableCell}>Nascimento</th>
                <th style={styles.tableCell}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td style={{ ...styles.tableCell, ...styles.emptyCell }} colSpan={5}>
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{customer.name}</strong>
                    </td>
                    <td style={styles.tableCell}>{customer.phone}</td>
                    <td style={styles.tableCell}>{customer.email || '-'}</td>
                    <td style={styles.tableCell}>
                      {customer.birthDate
                        ? new Date(customer.birthDate).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(customer)}
                            style={styles.actionButton}
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(customer.id)}
                            style={{ ...styles.actionButton, ...styles.dangerButton }}
                          >
                            Excluir
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
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.paginationButton}
          >
            Anterior
          </button>
          <span style={styles.pageInfo}>
            Página {page} de {totalPages} ({total} total)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={styles.paginationButton}
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
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
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
                  defaultValue={editingCustomer?.name || ''}
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
                  defaultValue={editingCustomer?.phone || ''}
                  required
                  placeholder="(11) 99999-9999"
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="email" style={styles.label}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  defaultValue={editingCustomer?.email || ''}
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="birthDate" style={styles.label}>
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  defaultValue={editingCustomer?.birthDate || ''}
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="notes" style={styles.label}>
                  Observações
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingCustomer?.notes || ''}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div style={styles.formActions}>
                <button type="button" onClick={closeModal} style={styles.secondaryButton}>
                  Cancelar
                </button>
                <button type="submit" style={styles.primaryButton}>
                  {editingCustomer ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    overflowX: 'auto',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
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
  dangerButton: { borderColor: '#ef4444', color: '#ef4444', backgroundColor: '#fef2f2' },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
    padding: 'var(--spacing-md)',
  },
  paginationButton: {
    padding: 'var(--spacing-xs) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  pageInfo: { fontSize: '0.875rem', color: 'var(--color-text-muted)' },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    color: '#991b1b',
    marginBottom: 'var(--spacing-lg)',
  },
  modalOverlay: {
    position: 'fixed',
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
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
  },
};
