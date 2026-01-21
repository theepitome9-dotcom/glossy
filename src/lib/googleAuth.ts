import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../api/supabase';

// Required for web browser auth
WebBrowser.maybeCompleteAuthSession();

// Supabase auth redirect URI
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'glossy',
  path: 'auth/callback',
});

export interface GoogleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  error?: string;
}

/**
 * Sign in with Google using Supabase OAuth
 * Returns user data if successful
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    if (__DEV__) {
      console.log('[GoogleAuth] Starting Google sign-in with redirect:', redirectUri);
    }

    // Start OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // We'll handle the browser ourselves
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      if (__DEV__) {
        console.error('[GoogleAuth] OAuth error:', error);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.url) {
      return {
        success: false,
        error: 'Failed to get authentication URL',
      };
    }

    if (__DEV__) {
      console.log('[GoogleAuth] Opening auth URL...');
    }

    // Open the OAuth URL in browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri,
      {
        showInRecents: true,
      }
    );

    if (__DEV__) {
      console.log('[GoogleAuth] Browser result:', result.type);
    }

    if (result.type === 'success' && result.url) {
      // Extract tokens from the callback URL
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.substring(1)); // Remove # prefix

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        // Set the session with the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          if (__DEV__) {
            console.error('[GoogleAuth] Session error:', sessionError);
          }
          return {
            success: false,
            error: sessionError.message,
          };
        }

        if (sessionData.user) {
          if (__DEV__) {
            console.log('[GoogleAuth] Sign-in successful:', sessionData.user.email);
          }
          return {
            success: true,
            user: {
              id: sessionData.user.id,
              email: sessionData.user.email || '',
              name: sessionData.user.user_metadata?.full_name ||
                    sessionData.user.user_metadata?.name ||
                    sessionData.user.email?.split('@')[0] || '',
              avatar: sessionData.user.user_metadata?.avatar_url,
            },
          };
        }
      }

      // Try to get existing session
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session?.user) {
        const user = existingSession.session.user;
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email?.split('@')[0] || '',
            avatar: user.user_metadata?.avatar_url,
          },
        };
      }
    }

    if (result.type === 'cancel') {
      return {
        success: false,
        error: 'Sign-in was cancelled',
      };
    }

    return {
      success: false,
      error: 'Authentication failed. Please try again.',
    };
  } catch (error: any) {
    if (__DEV__) {
      console.error('[GoogleAuth] Error:', error);
    }
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out of Google/Supabase
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await supabase.auth.signOut();
    if (__DEV__) {
      console.log('[GoogleAuth] Signed out successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[GoogleAuth] Sign out error:', error);
    }
  }
}

/**
 * Get current Google user if signed in
 */
export async function getCurrentGoogleUser(): Promise<GoogleAuthResult['user'] | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const user = data.session.user;
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] || '',
        avatar: user.user_metadata?.avatar_url,
      };
    }
    return null;
  } catch (error) {
    if (__DEV__) {
      console.error('[GoogleAuth] Get user error:', error);
    }
    return null;
  }
}
