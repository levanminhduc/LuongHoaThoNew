const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function getCryptoKey(keyMaterial: string): Promise<CryptoKey> {
  let cached = keyCache.get(keyMaterial);
  if (!cached) {
    cached = crypto.subtle
      .digest("SHA-256", encoder.encode(keyMaterial))
      .then((digest) =>
        crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      );
    keyCache.set(keyMaterial, cached);
  }
  return cached;
}

export async function encryptJson(
  keyMaterial: string,
  payload: unknown,
): Promise<string> {
  const key = await getCryptoKey(keyMaterial);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptJson<T>(
  keyMaterial: string,
  stored: string,
): Promise<T> {
  const [ivPart, cipherPart] = stored.split(".");
  if (!ivPart || !cipherPart) {
    throw new Error("Invalid encrypted payload format");
  }
  const key = await getCryptoKey(keyMaterial);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(cipherPart),
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}
