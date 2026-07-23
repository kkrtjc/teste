// ─────────────────────────────────────────────────────────────────────────────
// biometricAuth.ts
// Login biométrico via WebAuthn (Face ID / Touch ID / Impressão Digital).
// Padrão W3C — mesmo protocolo usado por Google, Apple e Microsoft.
// ─────────────────────────────────────────────────────────────────────────────

const BIOMETRIC_KEY = '@mura-manager:biometric-credential';
const BIOMETRIC_USER_KEY = '@mura-manager:biometric-user-id';

/** Verifica se o dispositivo suporta WebAuthn (Face ID / biometria) */
export function isBiometricAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/** Verifica de forma assíncrona se o autenticador de plataforma está disponível */
export async function checkBiometricSupport(): Promise<boolean> {
  if (!isBiometricAvailable()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Verifica se o usuário atual já tem uma credencial biométrica registrada */
export function hasBiometricRegistered(): boolean {
  return !!localStorage.getItem(BIOMETRIC_KEY);
}

/** Retorna o userId vinculado à credencial biométrica */
export function getBiometricUserId(): string | null {
  return localStorage.getItem(BIOMETRIC_USER_KEY);
}

/**
 * Registra uma credencial biométrica para o usuário atual.
 * Deve ser chamado APÓS o login normal com senha, com aprovação do usuário.
 *
 * @param userId ID único do usuário (email ou CPF)
 * @returns `true` se registrou com sucesso
 */
export async function registerBiometric(userId: string): Promise<boolean> {
  if (!isBiometricAvailable()) return false;

  try {
    // Gera um challenge aleatório seguro (32 bytes)
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Converte userId para Uint8Array
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Mura Manager',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: userId,
          displayName: 'Mura Manager',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256 (ECDSA P-256)
          { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Somente autenticadores internos (Face ID, Touch ID, etc.)
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (!credential) return false;

    // Serializa o ID da credencial em base64url para persistência
    const rawId = new Uint8Array(credential.rawId);
    const credentialIdB64 = btoa(String.fromCharCode(...rawId));

    localStorage.setItem(BIOMETRIC_KEY, credentialIdB64);
    localStorage.setItem(BIOMETRIC_USER_KEY, userId);

    return true;
  } catch (err: any) {
    // NotAllowedError = usuário cancelou ou biometria falhou
    if (err?.name !== 'NotAllowedError') {
      console.error('[Biometric] Erro ao registrar credencial:', err);
    }
    return false;
  }
}

/**
 * Autentica o usuário com biometria (Face ID / Touch ID / fingerprint).
 * Retorna o userId vinculado à credencial se bem-sucedido, ou null se falhar.
 */
export async function authenticateWithBiometric(): Promise<string | null> {
  if (!isBiometricAvailable()) return null;

  const credentialIdB64 = localStorage.getItem(BIOMETRIC_KEY);
  if (!credentialIdB64) return null;

  try {
    // Reconstrói o rawId a partir do base64url salvo
    const rawIdBytes = Uint8Array.from(atob(credentialIdB64), c => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawIdBytes,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) return null;

    // Sucesso — retorna o userId vinculado
    return localStorage.getItem(BIOMETRIC_USER_KEY);
  } catch (err: any) {
    if (err?.name !== 'NotAllowedError') {
      console.error('[Biometric] Erro ao autenticar:', err);
    }
    return null;
  }
}

/** Remove a credencial biométrica salva (logout biométrico) */
export function removeBiometricCredential(): void {
  localStorage.removeItem(BIOMETRIC_KEY);
  localStorage.removeItem(BIOMETRIC_USER_KEY);
}
