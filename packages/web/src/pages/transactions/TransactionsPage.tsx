import { useState, useEffect } from 'react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type { Transaction, TransactionType, Appointment, Barber } from '../../types/api';

export function TransactionsPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const canManage = hasRole(UserRole.ADMIN);

  const loadTransactions = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getTransactions({
        page,
        limit: 10,
        type: typeFilter || undefined,
      });
      setTransactions(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar transações');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModalData = async (): Promise<void> => {
    try {
      setModalLoading(true);
      const [appointmentsRes, barbersRes] = await Promise.all([
        api.getAppointments({ limit: 100 }),
        api.getBarbers({ limit: 100 }),
      ]);
      setAppointments(appointmentsRes.data);
      setBarbers(barbersRes.data);
    } catch {
      setError('Erro ao carregar dados do formulário');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter]);

  const handleCreate = async (data: {
    type: TransactionType;
    category: string;
    amount: string;
    description?: string;
    date: string;
    appointmentId?: string;
    barberId?: string;
  }): Promise<void> => {
    await api.createTransaction(data);
    setShowModal(false);
    loadTransactions();
  };

  const handleUpdate = async (
    id: string,
    data: {
      type?: TransactionType;
      category?: string;
      amount?: string;
      description?: string;
      date?: string;
      appointmentId?: string;
      barberId?: string;
    }
  ): Promise<void> => {
    await api.updateTransaction(id, data);
    setShowModal(false);
    loadTransactions();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type') as TransactionType,
      category: formData.get('category') as string,
      amount: formData.get('amount') as string,
      description: (formData.get('description') as string) || undefined,
      date: formData.get('date') as string,
      appointmentId: (formData.get('appointmentId') as string) || undefined,
      barberId: (formData.get('barberId') as string) || undefined,
    };
    try {
      if (editingTransaction) {
        await handleUpdate(editingTransaction.id, data);
      } else {
        await handleCreate(data);
      }
    } catch {
      // Error handled by form submission
    }
  };

  const openCreateModal = (): void => {
    setEditingTransaction(null);
    loadModalData();
    setShowModal(true);
  };

  const openEditModal = (transaction: Transaction): void => {
    setEditingTransaction(transaction);
    loadModalData();
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  const formatCurrency = (amount: string): string => {
    return `R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getTypeBadge = (type: TransactionType): React.CSSProperties => {
    if (type === 'INCOME') {
      return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
    }
    return { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' };
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
                <th style={styles.tableCell}>Tipo</th>
                <th style={styles.tableCell}>Categoria</th>
                <th style={styles.tableCell}>Valor</th>
                <th style={styles.tableCell}>Data</th>
                <th style={styles.tableCell}>Descrição</th>
                <th style={styles.tableCell}>Agendamento</th>
                <th style={styles.tableCell}>Barbeiro</th>
                <th style={styles.tableCell}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.emptyCell}>
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.typeBadge,
                          ...getTypeBadge(t.type as TransactionType),
                        }}
                      >
                        {t.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{t.category}</td>
                    <td style={styles.tableCell}>{formatCurrency(t.amount)}</td>
                    <td style={styles.tableCell}>{formatDate(t.date)}</td>
                    <td style={styles.tableCell}>{t.description || '-'}</td>
                    <td style={styles.tableCell}>
                      {t.appointmentId ? t.appointmentId.slice(0, 8) : '-'}
                    </td>
                    <td style={styles.tableCell}>{t.barberId ? t.barberId.slice(0, 8) : '-'}</td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        {canManage && (
                          <button onClick={() => openEditModal(t)} style={styles.actionButton}>
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
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Transações</h1>
        {canManage && (
          <button onClick={openCreateModal} style={styles.primaryButton} disabled={modalLoading}>
            {modalLoading ? 'Carregando...' : 'Nova Transação'}
          </button>
        )}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>
      </header>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {renderContent()}

      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <header style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button onClick={closeModal} style={styles.closeButton} disabled={modalLoading}>
                ×
              </button>
            </header>
            <form onSubmit={handleSubmit} style={styles.form}>
              {modalLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <p>Carregando agendamentos e barbeiros...</p>
                </div>
              ) : (
                <>
                  <div style={styles.formField}>
                    <label htmlFor="type" style={styles.label}>
                      Tipo *
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      style={styles.select}
                      defaultValue={editingTransaction?.type || ''}
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="INCOME">Receita</option>
                      <option value="EXPENSE">Despesa</option>
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="category" style={styles.label}>
                      Categoria *
                    </label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      defaultValue={editingTransaction?.category || ''}
                      required
                      placeholder="Ex: Corte, Barba, Produtos, Aluguel, etc."
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="amount" style={styles.label}>
                      Valor *
                    </label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      defaultValue={editingTransaction?.amount || ''}
                      required
                      placeholder="0.00"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="description" style={styles.label}>
                      Descrição
                    </label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      defaultValue={editingTransaction?.description || ''}
                      placeholder="Descrição opcional"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="date" style={styles.label}>
                      Data *
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      defaultValue={
                        editingTransaction?.date || new Date().toISOString().split('T')[0]
                      }
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="appointmentId" style={styles.label}>
                      Agendamento (opcional)
                    </label>
                    <select
                      id="appointmentId"
                      name="appointmentId"
                      style={styles.select}
                      defaultValue={editingTransaction?.appointmentId || ''}
                    >
                      <option value="">Nenhum</option>
                      {appointments.map(appt => (
                        <option key={appt.id} value={appt.id}>
                          {appt.id.slice(0, 8)} - {new Date(appt.dateTime).toLocaleString('pt-BR')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="barberId" style={styles.label}>
                      Barbeiro (opcional)
                    </label>
                    <select
                      id="barberId"
                      name="barberId"
                      style={styles.select}
                      defaultValue={editingTransaction?.barberId || ''}
                    >
                      <option value="">Nenhum</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name} {barber.specialty ? `(${barber.specialty})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formActions}>
                    <button type="button" onClick={closeModal} style={styles.secondaryButton}>
                      Cancelar
                    </button>
                    <button type="submit" style={styles.primaryButton}>
                      {editingTransaction ? 'Salvar' : 'Criar'}
                    </button>
                  </div>
                </>
              )}
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
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
    gap: 'var(--spacing-md)',
    flexWrap: 'wrap' as const,
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' },
  filterSelect: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    backgroundColor: 'var(--color-surface)',
  },
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
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl)',
    gap: 'var(--spacing-md)',
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
  actions: { display: 'flex' as const, gap: 'var(--spacing-sm)' },
  actionButton: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontSize: '0.8125rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: '1px solid',
  },
  pagination: {
    display: 'flex' as const,
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
    display: 'flex' as const,
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
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex' as const,
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
  select: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    boxSizing: 'border-box' as const,
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
    display: 'flex' as const,
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
  },
};
