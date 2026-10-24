// Device session and username sign-in.
// SpacetimeDB identifies each device by a token kept in localStorage. Logging out forgets the
// token. Setting up sign-in stores this token sealed with a key derived from the password, so
// logging in (on this or another device) can unseal it and reconnect as the same person.
// The password itself never leaves the browser.

export const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'bridgehome-3386g';
export const TOKEN_KEY = `bridgehome/${DB_NAME}/auth_token`;
// Keep identities created before the proxy was introduced.
export const LEGACY_KEY = `ws://localhost:3000/${DB_NAME}/auth_token`;
export const GROUP_KEY = 'bridgehome.group';

export const storedToken = () => localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_KEY) ?? undefined;

// Restarts the app as another identity, or as a brand-new one when no token is given.
export function switchIdentity(token?: string) {
  for (const k of [TOKEN_KEY, LEGACY_KEY, GROUP_KEY]) localStorage.removeItem(k);
  if (token) localStorage.setItem(TOKEN_KEY, token);
  location.assign('/');
}

export const normalizeUsername = (u: string) => u.trim().toLowerCase();

// SHA-256 and HMAC in plain TypeScript: WebCrypto is unavailable on plain-http LAN addresses
// (phones on the same Wi-Fi, the Expo app), and every device must derive identical keys.
const K = Uint32Array.of(
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
);
const W = new Uint32Array(64);

export function sha256(data: Uint8Array) {
  const size = (data.length + 72) & ~63;
  const buf = new Uint8Array(size);
  buf.set(data);
  buf[data.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(size - 8, Math.floor(data.length / 0x20000000));
  view.setUint32(size - 4, data.length << 3);
  const H = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
  for (let o = 0; o < size; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15], y = W[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[i] = W[i - 16] + s0 + W[i - 7] + s1;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  H.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

export function hmac(key: Uint8Array, message: Uint8Array) {
  const k = new Uint8Array(64);
  k.set(key.length > 64 ? sha256(key) : key);
  const inner = new Uint8Array(64 + message.length), outer = new Uint8Array(96);
  for (let i = 0; i < 64; i++) { inner[i] = k[i] ^ 0x36; outer[i] = k[i] ^ 0x5c; }
  inner.set(message, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

const withCounter = (prefix: Uint8Array, n: number) => {
  const out = new Uint8Array(prefix.length + 4);
  out.set(prefix);
  new DataView(out.buffer).setUint32(prefix.length, n);
  return out;
};

export function pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, length: number) {
  const out = new Uint8Array(length);
  for (let block = 1; (block - 1) * 32 < length; block++) {
    let u = hmac(password, withCounter(salt, block));
    const t = u.slice();
    for (let i = 1; i < iterations; i++) {
      u = hmac(password, u);
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
    }
    out.set(t.subarray(0, length - (block - 1) * 32), (block - 1) * 32);
  }
  return out;
}

const ITERATIONS = 100_000;
const NONCE = 16;
const encoder = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], x => parseInt(x, 16));

export async function deriveKeys(username: string, password: string) {
  const pw = encoder.encode(password), salt = encoder.encode(`bridgehome/${DB_NAME}/${normalizeUsername(username)}`);
  const subtle = globalThis.crypto?.subtle;
  let bits: Uint8Array;
  if (subtle) {
    const key = await subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
    bits = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 512));
  } else {
    // Let the "Checking…" state paint before the slow synchronous fallback runs.
    await new Promise(r => setTimeout(r, 30));
    bits = pbkdf2(pw, salt, ITERATIONS, 64);
  }
  const master = bits.slice(32);
  return { authKey: hex(bits.slice(0, 32)), encKey: hmac(master, encoder.encode('enc')), macKey: hmac(master, encoder.encode('mac')) };
}

// HMAC-SHA256 in counter mode, so sealing works the same with or without WebCrypto.
function keystream(key: Uint8Array, nonce: Uint8Array, length: number) {
  const out = new Uint8Array(length);
  for (let i = 0; i * 32 < length; i++) out.set(hmac(key, withCounter(nonce, i)).subarray(0, length - i * 32), i * 32);
  return out;
}

// Encrypt-then-MAC: nonce ‖ ciphertext ‖ tag, hex-encoded.
export async function sealToken(username: string, password: string, token: string) {
  const { authKey, encKey, macKey } = await deriveKeys(username, password);
  const plain = encoder.encode(token);
  const body = new Uint8Array(NONCE + plain.length);
  body.set(crypto.getRandomValues(new Uint8Array(NONCE)));
  const ks = keystream(encKey, body.subarray(0, NONCE), plain.length);
  plain.forEach((b, i) => { body[NONCE + i] = b ^ ks[i]; });
  return { authKey, sealedToken: hex(body) + hex(hmac(macKey, body)) };
}


export function unsealToken(keys: { encKey: Uint8Array; macKey: Uint8Array }, sealed: string) {
  const all = unhex(sealed);
  const body = all.subarray(0, all.length - 32), tag = all.subarray(all.length - 32);
  if (body.length <= NONCE || hex(hmac(keys.macKey, body)) !== hex(tag)) throw Error('Saved sign-in could not be unlocked. Set up sign-in again on your original device.');
  const ks = keystream(keys.encKey, body.subarray(0, NONCE), body.length - NONCE);
  return new TextDecoder().decode(body.subarray(NONCE).map((b, i) => b ^ ks[i]));
}

export const newAttemptId = () => hex(crypto.getRandomValues(new Uint8Array(12)));
