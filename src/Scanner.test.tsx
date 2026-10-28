// @vitest-environment jsdom
import { act as reactAct, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Scanner } from './Scanner';
import { service, type Snapshot } from './service';
import { startCamera } from './camera';
vi.mock('./service', () => ({ service: { scan: vi.fn() } }));
vi.mock('./camera', () => ({ startCamera: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const user = { id: 'organizer', name: 'Organizer', email: 'a@example.test', role: 'organizer' as const, organizationId: 'org' };
const data = { events: [{ id: 'event', organizationId: 'org', title: 'Welcome day', status: 'open' }] } as Snapshot;
const run = async (work: () => Promise<unknown>) => { try { await work(); return true; } catch { return false; } };
it('submits external QR text unchanged and recovers through all four outcomes', async () => {
  vi.mocked(service.scan).mockResolvedValueOnce('Student checked in successfully').mockResolvedValueOnce('Already checked in').mockRejectedValueOnce(new Error('Wrong event')).mockRejectedValueOnce(new Error('Invalid ticket payload.'));
  render(<MemoryRouter><Scanner data={data} user={user} act={run}/></MemoryRouter>);
  for (const [payload, result] of [[' {"ticket":"real"} ', 'Student checked in successfully'], ['repeat', 'Already checked in'], ['wrong', 'Wrong event'], ['broken', 'Invalid ticket payload.']]) {
    fireEvent.change(screen.getByLabelText('QR payload'), { target: { value: payload } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate QR' }));
    expect(await screen.findByText(result)).toBeTruthy();
    expect(service.scan).toHaveBeenLastCalledWith('event', payload);
  }
  expect(screen.getByRole('button', { name: 'Validate QR' }).hasAttribute('disabled')).toBe(false);
});
it('aborts an outstanding camera start when the scanner unmounts', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(startCamera).mockImplementation(async (_video, _decode, s) => { signal = s; });
  const view = render(<MemoryRouter><Scanner data={data} user={user} act={run}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
  await reactAct(async () => { await Promise.resolve(); });
  view.unmount();
  expect(signal?.aborted).toBe(true);
});
