import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ client: vi.fn() }));
import { client } from './supabase';
import { checked, service } from './service';

describe('Supabase service error and auth boundaries', () => {
  it('surfaces database errors and missing rows instead of claiming success', () => {
    expect(() => checked({ data: null, error: { message: 'This event is full.' } })).toThrow('full');
    expect(() => checked({ data: null, error: null })).toThrow('no data');
  });
  it('reports email confirmation without inventing a signed-in session', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(client).mockReturnValue({ auth: { signUp } } as unknown as ReturnType<typeof client>);
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(await service.signup(' Alex ', 'ALEX@EXAMPLE.TEST ', 'test-only')).toEqual({ needsConfirmation: true });
    expect(signUp.mock.calls[0][0]).toMatchObject({ email: 'alex@example.test', options: { data: { full_name: 'Alex' } } });
  });
  it('supports immediate no-SMTP signup without sending an elevated role', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'new-student' } } }, error: null });
    vi.mocked(client).mockReturnValue({ auth: { signUp } } as unknown as ReturnType<typeof client>);
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
    expect(await service.signup('New Student', 'new@example.com', 'test-only')).toEqual({ needsConfirmation: false });
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: 'New Student' });
  });
  it('does not read profiles or private data when signed out', async () => {
    vi.mocked(client).mockReturnValue({ auth: { getSession: async () => ({ data: { session: null }, error: null }) } } as unknown as ReturnType<typeof client>);
    expect(await service.session()).toBeNull();
  });
  it('uses server QR validation instead of writing attendance in the browser', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'Already checked in', error: null });
    vi.mocked(client).mockReturnValue({ rpc } as unknown as ReturnType<typeof client>);
    expect(await service.scan('event', 'opaque-payload')).toBe('Already checked in');
    expect(rpc).toHaveBeenCalledWith('scan_ticket', { selected_event: 'event', qr_payload: 'opaque-payload' });
  });
});
