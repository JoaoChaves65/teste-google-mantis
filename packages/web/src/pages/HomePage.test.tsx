import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the application title', () => {
    render(<HomePage />);
    expect(screen.getByText('BarberLab')).toBeInTheDocument();
  });

  it('renders the security lab description', () => {
    render(<HomePage />);
    expect(screen.getByText(/Security Lab Educational Project/)).toBeInTheDocument();
  });

  it('renders status cards for all three components', () => {
    render(<HomePage />);
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('API Secure')).toBeInTheDocument();
    expect(screen.getByText('API Vulnerable')).toBeInTheDocument();
  });
});
