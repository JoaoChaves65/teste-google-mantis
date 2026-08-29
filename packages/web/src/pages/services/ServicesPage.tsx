import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type { Service } from '../../types/api';

export function ServicesPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const canManage = hasRole(UserRole.ADMIN);

  const loadServices = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getServices({ page, limit: 10 });
      setServices(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar serviços');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [page]);

  const handleCreate = async (data: {
    name: string;
    description?: string;
    price: string;
    durationMinutes: number;
  }): Promise<void> => {
    await api.createService(data);
    setShowModal(false);
    loadServices();
  };

  const handleUpdate = async (
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: string;
      durationMinutes?: number;
      active?: boolean;
    }
  ): Promise<void> => {
    await api.updateService(id, data);
    setShowModal(false);
    loadServices();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      price: formData.get('price') as string,
      durationMinutes: parseInt(formData.get('durationMinutes') as string, 10),
      active: formData.get('active') === 'on',
    };
    try {
      if (editingService) {
        await handleUpdate(editingService.id, data);
      } else {
        await handleCreate(data);
      }
    } catch {
      // Error handled by form submission
    }
  };

  const openCreateModal = (): void => {
    setEditingService(null);
    setShowModal(true);
  };

  const openEditModal = (service: Service): void => {
    setEditingService(service);
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingService(null);
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
        <h1 style={styles.title}>Serviços</h1>
        {canManage && (
          <button onClick={openCreateModal} style={styles.primaryButton}>
            Novo Serviço
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
                <th style={styles.tableCell}>Descrição</th>
                <th style={styles.tableCell}>Preço</th>
                <th style={styles.tableCell}>Duração</th>
                <th style={styles.tableCell}>Status</th>
                <th style={styles.tableCell}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Nenhum serviço encontrado
                  </td>
                </tr>
              ) : (
                services.map(service => (
                  <tr key={service.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{service.name}</strong>
                    </td>
                    <td style={styles.tableCell}>{service.description || '-'}</td>
                    <td style={styles.tableCell}>
                      R$ {parseFloat(service.price).toFixed(2).replace('.', ',')}
                    </td>
                    <td style={styles.tableCell}>{service.durationMinutes} min</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: service.active ? '#dcfce7' : '#fef2f2',
                          color: service.active ? '#166534' : '#991b1b',
                          borderColor: service.active ? '#86efac' : '#fecaca',
                        }}
                      >
                        {service.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        {canManage && (
                          <button
                            onClick={() => openEditModal(service)}
                            style={styles.actionButton}
                          >
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
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
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
                  defaultValue={editingService?.name || ''}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="description" style={styles.label}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingService?.description || ''}
                  style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="price" style={styles.label}>
                  Preço *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  min="0"
                  defaultValue={editingService?.price || ''}
                  required
                  placeholder="0.00"
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label htmlFor="durationMinutes" style={styles.label}>
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  id="durationMinutes"
                  name="durationMinutes"
                  min="1"
                  defaultValue={editingService?.durationMinutes || ''}
                  required
                  style={styles.input}
                />
              </div>
              {editingService && (
                <div style={styles.formField}>
                  <label style={styles.label}>Status</label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={editingService.active}
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
                  {editingService ? 'Salvar' : 'Criar'}
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
