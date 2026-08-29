import { env } from '../../config/env';
import type {
  ApiErrorResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  User,
  PaginatedResponse,
  Customer,
  Barber,
  Service,
  Appointment,
  Transaction,
  CreateAppointmentRequest,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateBarberRequest,
  UpdateBarberRequest,
  CreateServiceRequest,
  UpdateServiceRequest,
  UpdateTransactionRequest,
  CreateTransactionRequest as CreateTransactionRequestType,
  AppointmentAction,
} from '../../types/api';

const API_BASE_URL = env.VITE_API_BASE_URL;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    try {
      const stored = sessionStorage.getItem('access_token');
      if (stored) {
        this.accessToken = stored;
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    if (token) {
      sessionStorage.setItem('access_token', token);
    } else {
      sessionStorage.removeItem('access_token');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const method = env.NODE_ENV === 'production' ? 'POST' : 'GET';
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Refresh failed');
        }

        const data = (await response.json()) as {
          accessToken: string;
          accessTokenExpiresAt: string;
        };
        this.setAccessToken(data.accessToken);
        return data.accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401 && this.accessToken) {
      try {
        const newToken = await this.refreshAccessToken();
        requestHeaders.Authorization = `Bearer ${newToken}`;

        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
      } catch {
        this.setAccessToken(null);
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
      (error as Error & { status: number; code?: string }).status = response.status;
      (error as Error & { status: number; code?: string }).code = errorData.error?.code;
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    this.setAccessToken(data.accessToken);
    return data;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setAccessToken(null);
  }

  async me(): Promise<MeResponse> {
    const user = await this.request<User>('/auth/me');
    return { user };
  }

  async refresh(): Promise<RefreshTokenResponse> {
    const method = env.NODE_ENV === 'production' ? 'POST' : 'GET';
    const data = await this.request<RefreshTokenResponse>('/auth/refresh', {
      method,
    });
    this.setAccessToken(data.accessToken);
    return data;
  }

  async getUsers(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<User>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<PaginatedResponse<User>>(`/api/v1/users?${query.toString()}`);
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/v1/users/${id}`);
  }

  async getCustomers(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Customer>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<PaginatedResponse<Customer>>(`/api/v1/customers?${query.toString()}`);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request<Customer>(`/api/v1/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    return this.request<Customer>('/api/v1/customers', {
      method: 'POST',
      body: data,
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    return this.request<Customer>(`/api/v1/customers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.request<void>(`/api/v1/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async getBarbers(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Barber>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<PaginatedResponse<Barber>>(`/api/v1/barbers?${query.toString()}`);
  }

  async getBarber(id: string): Promise<Barber> {
    return this.request<Barber>(`/api/v1/barbers/${id}`);
  }

  async createBarber(data: CreateBarberRequest): Promise<Barber> {
    return this.request<Barber>('/api/v1/barbers', {
      method: 'POST',
      body: data,
    });
  }

  async updateBarber(id: string, data: UpdateBarberRequest): Promise<Barber> {
    return this.request<Barber>(`/api/v1/barbers/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async getServices(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Service>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<PaginatedResponse<Service>>(`/api/v1/services?${query.toString()}`);
  }

  async getService(id: string): Promise<Service> {
    return this.request<Service>(`/api/v1/services/${id}`);
  }

  async createService(data: CreateServiceRequest): Promise<Service> {
    return this.request<Service>('/api/v1/services', {
      method: 'POST',
      body: data,
    });
  }

  async updateService(id: string, data: UpdateServiceRequest): Promise<Service> {
    return this.request<Service>(`/api/v1/services/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async getAppointments(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Appointment>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    return this.request<PaginatedResponse<Appointment>>(`/api/v1/appointments?${query.toString()}`);
  }

  async getAppointment(id: string): Promise<Appointment> {
    return this.request<Appointment>(`/api/v1/appointments/${id}`);
  }

  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    return this.request<Appointment>('/api/v1/appointments', {
      method: 'POST',
      body: data,
    });
  }

  async updateAppointmentStatus(id: string, action: AppointmentAction): Promise<Appointment> {
    return this.request<Appointment>(`/api/v1/appointments/${id}/status`, {
      method: 'PATCH',
      body: { action },
    });
  }

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<PaginatedResponse<Transaction>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    return this.request<PaginatedResponse<Transaction>>(`/api/v1/transactions?${query.toString()}`);
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/api/v1/transactions/${id}`);
  }

  async createTransaction(data: CreateTransactionRequestType): Promise<Transaction> {
    return this.request<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: data,
    });
  }

  async updateTransaction(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    return this.request<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }
}

export const api = new ApiClient();
