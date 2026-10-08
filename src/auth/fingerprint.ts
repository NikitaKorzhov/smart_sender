export function getOrCreateFingerprint(): string {
  const STORAGE_KEY = 'device_fingerprint';
  let fingerprint = localStorage.getItem(STORAGE_KEY);

  if (!fingerprint || fingerprint.length !== 32) {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    fingerprint = Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(STORAGE_KEY, fingerprint);
  }

  return fingerprint;
}
