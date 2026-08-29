/**
 * API response types mirroring the SECURE API v1 contracts.
 * These types mirror the domain entities from @barberlab/core
 * but are defined locally to avoid cross-package dependency cycles.
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BARBER = 'BARBER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Barber {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  hireDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  dateTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: string;
  description: string | null;
  date: string;
  appointmentId: string | null;
  barberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface MeResponse {
  user: User;
}

export interface CreateAppointmentRequest {
  customerId: string;
  barberId: string;
  serviceId: string;
  dateTime: string;
  notes?: string;
}

export interface UpdateAppointmentStatusRequest {
  action: 'confirm' | 'cancel' | 'complete';
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
}

export interface CreateBarberRequest {
  name: string;
  phone: string;
  specialty: string;
  hireDate: string;
}

export interface UpdateBarberRequest {
  name?: string;
  phone?: string;
  specialty?: string;
  hireDate?: string;
  active?: boolean;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: string;
  durationMinutes: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: string;
  durationMinutes?: number;
  active?: boolean;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  category: string;
  amount: string;
  description?: string;
  date: string;
  appointmentId?: string;
  barberId?: string;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  category?: string;
  amount?: string;
  description?: string;
  date?: string;
  appointmentId?: string;
  barberId?: string;
}

export type AppointmentAction = 'confirm' | 'cancel' | 'complete';
