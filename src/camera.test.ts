// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startCamera } from './camera';
vi.mock('@zxing/browser', () => ({ BrowserQRCodeReader: class {
  async decodeFromVideoElement() { return { stop: vi.fn() }; }
} }));
it('releases a stream when permission resolves after cancellation', async () => {
  const stop = vi.fn();
  let resolve!: (stream: MediaStream) => void;
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise<MediaStream>(r => { resolve = r; }) } });
  const controller = new AbortController();
  const pending = startCamera(document.createElement('video'), vi.fn(), controller.signal);
  controller.abort();
  resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await pending;
  expect(stop).toHaveBeenCalledOnce();
});
it('does not clear a newer preview when an old permission request finishes late', async () => {
  const oldStop = vi.fn(), newStop = vi.fn();
  const oldStream = { getTracks: () => [{ stop: oldStop }] } as unknown as MediaStream;
  const newStream = { getTracks: () => [{ stop: newStop }] } as unknown as MediaStream;
  let oldResolve!: (stream: MediaStream) => void;
  const getUserMedia = vi.fn().mockImplementationOnce(() => new Promise<MediaStream>(resolve => { oldResolve = resolve; })).mockResolvedValueOnce(newStream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const video = document.createElement('video');
  const old = new AbortController(), current = new AbortController();
  const first = startCamera(video, vi.fn(), old.signal);
  old.abort();
  await startCamera(video, vi.fn(), current.signal);
  oldResolve(oldStream); await first;
  expect(oldStop).toHaveBeenCalledOnce();
  expect(video.srcObject).toBe(newStream);
  expect(newStop).not.toHaveBeenCalled();
  current.abort();
});
