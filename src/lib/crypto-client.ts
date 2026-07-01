// End-to-end encryption for submissions, ODK-style. Runs only in the browser.
//
// Each form has an RSA-OAEP keypair. The public key is stored on the server; the private
// key is wrapped with a key derived from the owner's passphrase (PBKDF2 + AES-GCM) and the
// passphrase is never sent anywhere. Every submission gets a fresh AES-GCM content key,
// which is itself wrapped to the form's public key. Decryption (and therefore export and
// analytics for encrypted forms) happens client-side after the owner enters the passphrase.

import type { Answers } from "./expr";

const PBKDF2_ITERS = 210_000;

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64decode(s: string): ArrayBuffer {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

async function deriveWrapKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface FormKeys {
  publicKey: string;
  privKeyEnc: string;
  keySalt: string;
  keyIv: string;
}

// Generate a form keypair and wrap the private key under the passphrase.
export async function generateFormKeys(passphrase: string): Promise<FormKeys> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrapKey = await deriveWrapKey(passphrase, salt.buffer);
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, pkcs8);

  return {
    publicKey: b64encode(spki),
    privKeyEnc: b64encode(wrapped),
    keySalt: b64encode(salt.buffer),
    keyIv: b64encode(iv.buffer),
  };
}

export interface EncryptedPayload {
  encKey: string;
  encIv: string;
  encData: string;
}

// Encrypt one submission's answers to the form's public key.
export async function encryptAnswers(publicKeyB64: string, answers: Answers): Promise<EncryptedPayload> {
  const pub = await crypto.subtle.importKey("spki", b64decode(publicKeyB64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = randomBytes(12);
  const plaintext = new TextEncoder().encode(JSON.stringify(answers));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, contentKey, plaintext);
  const rawKey = await crypto.subtle.exportKey("raw", contentKey);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, rawKey);
  return { encKey: b64encode(wrappedKey), encIv: b64encode(iv.buffer), encData: b64encode(cipher) };
}

// Recover the form's private key from the wrapped blob and passphrase. Throws on a wrong
// passphrase (AES-GCM auth failure), which callers surface as "wrong passphrase".
export async function unwrapPrivateKey(keys: { privKeyEnc: string; keySalt: string; keyIv: string }, passphrase: string): Promise<CryptoKey> {
  const wrapKey = await deriveWrapKey(passphrase, b64decode(keys.keySalt));
  const pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(keys.keyIv) }, wrapKey, b64decode(keys.privKeyEnc));
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
}

export async function decryptSubmission(privateKey: CryptoKey, payload: EncryptedPayload): Promise<Answers> {
  const rawKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, b64decode(payload.encKey));
  const contentKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(payload.encIv) }, contentKey, b64decode(payload.encData));
  return JSON.parse(new TextDecoder().decode(plaintext)) as Answers;
}
