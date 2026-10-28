// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportRefresh } from './ReportRefresh';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('refreshes other sessions periodically and exposes refresh failure without discarding report content', async () => {
  vi.useFakeTimers();
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(<><ReportRefresh refresh={refresh}/><p>Checked in: 7</p></>);
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(refresh).toHaveBeenCalledTimes(1);
  refresh.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.getByRole('alert').textContent).toContain('out of date');
  expect(screen.getByText('Checked in: 7')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh report' }));
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByRole('alert')).toBeNull();
});
it('cancels polling on route exit and never overlaps its own requests', async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const refresh = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const view = render(<ReportRefresh refresh={refresh}/>);
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(refresh).toHaveBeenCalledOnce();
  view.unmount();
  await act(async () => { finish(); await vi.advanceTimersByTimeAsync(10000); });
  expect(refresh).toHaveBeenCalledOnce();
});
