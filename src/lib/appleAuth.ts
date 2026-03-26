import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../api/supabase';
import { Platform } from 'react-native';

export interface AppleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

/**
 * Check if Apple Sign-In is available on this device
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Sign in with Apple using Supabase
 */
export async function signInWithApple(): Promise<AppleAuthResult> {
  try {
    // Check availability
    const isAvailable = await isAppleSignInAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Apple Sign-In is not available on this device',
      };
    }

    if (__DEV__) {
      console.log('[AppleAuth] Starting Apple sign-in...');
    }

    // Generate a secure nonce
    const rawNonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    // Request Apple credentials
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (__DEV__) {
      console.log('[AppleAuth] Got Apple credential');
    }

    if (!credential.identityToken) {
      return {
        success: false,
        error: 'No identity token received from Apple',
      };
    }

    // Sign in with Supabase using the Apple token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      if (__DEV__) {
        console.error('[AppleAuth] Supabase error:', error);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    if (data.user) {
      // Build user name from Apple credential or Supabase metadata
      let fullName = '';

      // Apple only provides name on first sign-in
      if (credential.fullName) {
        const parts = [
          credential.fullName.givenName,
          credential.fullName.familyName,
        ].filter(Boolean);
        fullName = parts.join(' ');
      }

      // Fallback to Supabase metadata or email
      if (!fullName) {
        fullName = data.user.user_metadata?.full_name ||
                   data.user.user_metadata?.name ||
                   data.user.email?.split('@')[0] || '';
      }

      if (__DEV__) {
        console.log('[AppleAuth] Sign-in successful:', data.user.email);
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: credential.email || data.user.email || '',
          name: fullName,
        },
      };
    }

    return {
      success: false,
      error: 'Authentication failed. Please try again.',
    };
  } catch (error: any) {
    // Handle user cancellation
    if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
      return {
        success: false,
        error: 'Sign-in was cancelled',
      };
    }

    if (__DEV__) {
      console.error('[AppleAuth] Error:', error);
    }
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Generate a secure random nonce for Apple Sign-In
 */
function generateNonce(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);

  // Use crypto for secure random values
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}
