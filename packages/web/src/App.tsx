import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { BarbersPage } from './pages/barbers/BarbersPage';
import { ServicesPage } from './pages/services/ServicesPage';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { UsersPage } from './pages/users/UsersPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { UserRole } from './types/api';
import './index.css';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/barbers"
              element={
                <ProtectedRoute allowedRoles={[UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN]}>
                  <BarbersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute allowedRoles={[UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN]}>
                  <ServicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute allowedRoles={[UserRole.CUSTOMER, UserRole.BARBER, UserRole.ADMIN]}>
                  <AppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
