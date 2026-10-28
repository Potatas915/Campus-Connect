// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Confirmations } from './Confirmations';
import { service } from './service';
vi.mock('./service', () => ({ service: { publishConfirmation: vi.fn() } }));
afterEach(cleanup);
const notification = { registrationId: 'reg', eventId: 'event', status: 'failed' as const, message: null, error: 'Confirmation could not be published. Please retry.' };
it('shows publication failure and retries its existing registration', async () => {
  const act = vi.fn(async (work: () => Promise<unknown>) => { await work(); return true; });
  render(<MemoryRouter><Confirmations notifications={[notification]} events={[{ id: 'event', title: 'Welcome day' }]} act={act} organizer/></MemoryRouter>);
  expect(screen.getByText('Welcome day')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retry confirmation' }));
  expect(service.publishConfirmation).toHaveBeenCalledWith('reg');
});
it('keeps cancelled confirmation history inactive without a retry action', () => {
  render(<MemoryRouter><Confirmations notifications={[{ ...notification, status: 'inactive' }]} events={[]} act={vi.fn()}/></MemoryRouter>);
  expect(screen.getByText(/Inactive/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Retry confirmation' })).toBeNull();
});
