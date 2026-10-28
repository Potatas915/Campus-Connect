export async function startCamera(video: HTMLVideoElement, decoded: (payload: string) => void, signal: AbortSignal) {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost. You can paste the QR payload below.');
  if (signal.aborted) return;
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  let controls: { stop: () => void } | undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    controls?.stop();
    stream.getTracks().forEach(track => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
    signal.removeEventListener('abort', stop);
  };
  signal.addEventListener('abort', stop, { once: true });
  if (signal.aborted) { stop(); return; }
  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    if (signal.aborted) { stop(); return; }
    // Own stream cleanup here: decoder finalizers must not clear a newer preview.
    video.srcObject = stream;
    controls = await new BrowserQRCodeReader().decodeFromVideoElement(video, result => {
      if (!signal.aborted && result) decoded(result.getText());
    });
    // Permission/decoder startup can finish after the route has already closed.
    if (signal.aborted) controls.stop();
  } catch (error) { stop(); throw error; }
}
