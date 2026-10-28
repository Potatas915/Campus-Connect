// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { service, type Event, type Snapshot } from './service';

vi.mock('./supabase', () => ({ configurationError: '', supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) } } }));
vi.mock('./service', () => ({ service: { session: vi.fn(), snapshot: vi.fn(), availability: vi.fn(), listEvents: vi.fn(), register: vi.fn() } }));
const event: Event = { id: 'event', organizationId: 'org', title: 'Capacity regression event', description: 'A synthetic regression fixture.', venue: 'Hall', category: 'Technology', date: '2030-11-30T02:00:00Z', capacity: 1, status: 'open', theme: 0, registrationDeadline: null };
const initial: Snapshot = { events: [event], organizations: [{ id: 'org', name: 'Test org', short: 'TEST' }], registrations: [], tickets: [], attendance: [], users: [], notifications: [], counts: { event: 0 } };
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, '', '/events/event');
  vi.mocked(service.session).mockResolvedValue({ id: 'student', name: 'Test Student', email: 'student@example.test', role: 'student' });
  vi.mocked(service.snapshot).mockResolvedValue(initial);
  vi.mocked(service.availability).mockResolvedValue({ events: [event], counts: { event: 0 } });
  vi.mocked(service.listEvents).mockResolvedValue({ events: [event], total: 1, counts: { event: 0 } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('shared availability refresh', () => {
  it('reconciles the full event after a rejected registration while retaining its error', async () => {
    render(<App/>);
    const register = await screen.findByRole('button', { name: 'Save my spot' });
    vi.mocked(service.register).mockRejectedValue(new Error('This event is full.'));
    vi.mocked(service.snapshot).mockResolvedValue({ ...initial, counts: { event: 1 } });
    fireEvent.click(register);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This event is full.');
    expect((await screen.findByRole('button', { name: 'Registration unavailable' })).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Full')).toBeTruthy();
  });
  it('uses fresh counts when returning to the catalogue without reloading the browser', async () => {
    render(<App/>);
    await screen.findByRole('button', { name: 'Save my spot' });
    vi.mocked(service.snapshot).mockResolvedValue({ ...initial, counts: { event: 1 } });
    vi.mocked(service.listEvents).mockResolvedValue({ events: [event], total: 1, counts: { event: 1 } });
    fireEvent.click(screen.getByRole('link', { name: 'Discover events' }));
    expect(await screen.findByText('Full')).toBeTruthy();
    expect(screen.queryByText('1 spots left')).toBeNull();
  });
  it('updates a held-open event when another session takes its last seat', async () => {
    vi.useFakeTimers();
    render(<App/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByRole('button', { name: 'Save my spot' })).toBeTruthy();
    vi.mocked(service.availability).mockResolvedValue({ events: [event], counts: { event: 1 } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registration unavailable' }).hasAttribute('disabled')).toBe(true);
  });
  it('keeps the session and offers recovery when background availability fails', async () => {
    vi.useFakeTimers();
    render(<App/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    vi.mocked(service.availability).mockRejectedValue(new Error('Network unavailable'));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByTestId('availability-error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.queryByTestId('availability-error')).toBeNull();
  });
  it('keeps an accepted registration successful when refreshing the snapshot fails', async () => {
    render(<App/>);
    const register = await screen.findByRole('button', { name: 'Save my spot' });
    vi.mocked(service.register).mockResolvedValue('Registration accepted. Confirmation is pending.');
    vi.mocked(service.snapshot).mockRejectedValue(new Error('Offline'));
    fireEvent.click(register);
    expect(await screen.findByTestId('confirmation-message')).toHaveProperty('textContent', expect.stringContaining('Registration accepted'));
    expect(screen.getByTestId('availability-error')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save my spot' })).toBeNull();
  });
  it('updates an open report when another session records attendance', async () => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/reports');
    vi.mocked(service.session).mockResolvedValue({ id: 'organizer', name: 'Organizer', email: 'org@example.test', role: 'organizer', organizationId: 'org' });
    render(<App/>);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    vi.mocked(service.snapshot).mockResolvedValue({ ...initial,
      registrations: [{ id: 'reg', studentId: 'student', eventId: 'event', status: 'attended', createdAt: '2026-10-29T00:00:00Z' }],
      attendance: [{ id: 'attendance', registrationId: 'reg', eventId: 'event', scannedAt: '2026-10-29T00:00:00Z' }],
      users: [{ id: 'student', name: 'Remote attendee', email: 'remote@example.test', role: 'student' }],
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('Remote attendee')).toBeTruthy();
    expect(screen.getByText('Checked in', { selector: 'span.status' })).toBeTruthy();
  });
  it('retains the report and signed-in session when tab focus refresh fails offline', async () => {
    window.history.replaceState({}, '', '/reports');
    vi.mocked(service.session).mockResolvedValue({ id: 'organizer', name: 'Organizer', email: 'org@example.test', role: 'organizer', organizationId: 'org' });
    render(<App/>);
    await screen.findByRole('button', { name: 'Refresh report' });
    vi.mocked(service.snapshot).mockRejectedValue(new Error('Offline'));
    fireEvent(window, new Event('focus'));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Attendance register' })).toBeTruthy();
  });
  it('ignores a stale failing refresh after a newer report refresh succeeds', async () => {
    window.history.replaceState({}, '', '/reports');
    vi.mocked(service.session).mockResolvedValue({ id: 'organizer', name: 'Organizer', email: 'org@example.test', role: 'organizer', organizationId: 'org' });
    render(<App/>);
    const button = await screen.findByRole('button', { name: 'Refresh report' });
    let rejectOld!: (error: Error) => void;
    vi.mocked(service.snapshot).mockImplementationOnce(() => new Promise<Snapshot>((_resolve, reject) => { rejectOld = reject; }));
    fireEvent(window, new Event('focus'));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(button);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { rejectOld(new Error('Stale offline result')); await Promise.resolve(); });
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
    expect(screen.queryByText('Stale offline result')).toBeNull();
    expect(screen.queryByTestId('availability-error')).toBeNull();
  });
});
