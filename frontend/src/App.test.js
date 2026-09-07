import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

test('renders Upgrade Hub staff login gate when unauthenticated', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/Upgrade Hub/i);
  expect(brandElements.length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: /Sign In to Upgrade Hub/i })).toBeInTheDocument();
  expect(screen.getByText(/Hasaranga Abeyrathna/i)).toBeInTheDocument();
});

test('enters dashboard when authenticated or in demo mode', () => {
  localStorage.setItem('upgrade-hub-user', JSON.stringify({
    id: 'test-admin',
    name: 'Super Admin',
    email: 'admin@upgradehub.lk',
    role: 'Admin'
  }));
  localStorage.setItem('upgrade-hub-token', 'valid-test-token');

  render(<App />);
  expect(screen.getByRole('heading', { name: /Point of Sale/i })).toBeInTheDocument();
  expect(screen.getByText(/Super Admin/i)).toBeInTheDocument();
});
