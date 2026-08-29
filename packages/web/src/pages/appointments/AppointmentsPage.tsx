import { useState, useEffect } from 'react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type { Appointment, AppointmentStatus, Customer, Barber, Service } from '../../types/api';

export function AppointmentsPage(): JSX.Element {
  const { hasRole } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const canManage =
    hasRole(UserRole.ADMIN) || hasRole(UserRole.BARBER) || hasRole(UserRole.CUSTOMER);

  const loadAppointments = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.getAppointments({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      setAppointments(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch {
      setError('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModalData = async (): Promise<void> => {
    try {
      setModalLoading(true);
      const [customersRes, barbersRes, servicesRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getBarbers({ limit: 100 }),
        api.getServices({ limit: 100 }),
      ]);
      setCustomers(customersRes.data);
      setBarbers(barbersRes.data.filter(b => b.active));
      setServices(servicesRes.data.filter(s => s.active));
    } catch {
      setError('Erro ao carregar dados do formulário');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [page, statusFilter]);

  const handleCreate = async (data: {
    customerId: string;
    barberId: string;
    serviceId: string;
    dateTime: string;
  }): Promise<void> => {
    await api.createAppointment(data);
    setShowModal(false);
    loadAppointments();
  };

  const handleStatusChange = async (
    id: string,
    action: 'confirm' | 'cancel' | 'complete'
  ): Promise<void> => {
    try {
      await api.updateAppointmentStatus(id, action);
      const response = await api.getAppointments({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      setAppointments(response.data);
    } catch {
      // Ignore errors, handled by UI
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customerId: formData.get('customerId') as string,
      barberId: formData.get('barberId') as string,
      serviceId: formData.get('serviceId') as string,
      dateTime: formData.get('dateTime') as string,
    };
    try {
      await handleCreate(data);
    } catch {
      // Error handled by form submission
    }
  };

  const openCreateModal = (): void => {
    loadModalData();
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
  };

  const getStatusBadge = (status: AppointmentStatus): React.CSSProperties => {
    switch (status) {
      case 'PENDING':
        return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
      case 'CONFIRMED':
        return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
      case 'COMPLETED':
        return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
      case 'CANCELLED':
        return { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' };
      default:
        return {
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
        };
    }
  };

  const formatDateTime = (dateTime: string): string => {
    return new Date(dateTime).toLocaleString('pt-BR');
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
                <th style={styles.tableCell}>Cliente</th>
                <th style={styles.tableCell}>Barbeiro</th>
                <th style={styles.tableCell}>Serviço</th>
                <th style={styles.tableCell}>Data/Hora</th>
                <th style={styles.tableCell}>Status</th>
                <th style={styles.tableCell}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Nenhum agendamento encontrado
                  </td>
                </tr>
              ) : (
                appointments.map(appt => (
                  <tr key={appt.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>Cliente {appt.customerId.slice(0, 8)}</td>
                    <td style={styles.tableCell}>Barbeiro {appt.barberId.slice(0, 8)}</td>
                    <td style={styles.tableCell}>Serviço {appt.serviceId.slice(0, 8)}</td>
                    <td style={styles.tableCell}>{formatDateTime(appt.dateTime)}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusBadge(appt.status as AppointmentStatus),
                        }}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleStatusChange(appt.id, 'confirm')}
                          disabled={appt.status !== 'PENDING'}
                          style={styles.actionButton}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleStatusChange(appt.id, 'complete')}
                          disabled={appt.status !== 'CONFIRMED'}
                          style={styles.actionButton}
                        >
                          Concluir
                        </button>
                        <button
                          onClick={() => handleStatusChange(appt.id, 'cancel')}
                          disabled={appt.status === 'CANCELLED' || appt.status === 'COMPLETED'}
                          style={{ ...styles.actionButton, ...styles.dangerButton }}
                        >
                          Cancelar
                        </button>
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
        <h1 style={styles.title}>Agendamentos</h1>
        <div style={{ display: 'flex' as const, gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          {canManage && (
            <button onClick={openCreateModal} style={styles.primaryButton} disabled={modalLoading}>
              {modalLoading ? 'Carregando...' : 'Novo Agendamento'}
            </button>
          )}
        </div>
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
              <h2 style={styles.modalTitle}>Novo Agendamento</h2>
              <button onClick={closeModal} style={styles.closeButton} disabled={modalLoading}>
                ×
              </button>
            </header>
            <form onSubmit={handleSubmit} style={styles.form}>
              {modalLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <p>Carregando clientes, barbeiros e serviços...</p>
                </div>
              ) : (
                <>
                  <div style={styles.formField}>
                    <label htmlFor="customerId" style={styles.label}>
                      Cliente *
                    </label>
                    <select id="customerId" name="customerId" required style={styles.select}>
                      <option value="">Selecione um cliente</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.phone || 'sem telefone'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="barberId" style={styles.label}>
                      Barbeiro *
                    </label>
                    <select id="barberId" name="barberId" required style={styles.select}>
                      <option value="">Selecione um barbeiro</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name} {barber.specialty ? `(${barber.specialty})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="serviceId" style={styles.label}>
                      Serviço *
                    </label>
                    <select id="serviceId" name="serviceId" required style={styles.select}>
                      <option value="">Selecione um serviço</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R${' '}
                          {parseFloat(service.price).toFixed(2).replace('.', ',')} (
                          {service.durationMinutes} min)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label htmlFor="dateTime" style={styles.label}>
                      Data e Hora *
                    </label>
                    <input
                      type="datetime-local"
                      id="dateTime"
                      name="dateTime"
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formActions}>
                    <button type="button" onClick={closeModal} style={styles.secondaryButton}>
                      Cancelar
                    </button>
                    <button type="submit" style={styles.primaryButton}>
                      Criar
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
  dangerButton: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' },
  statusBadge: {
    display: 'inline-block',
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
