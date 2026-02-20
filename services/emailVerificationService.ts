import { supabase } from './supabase';

export interface VerificationResponse {
  success: boolean;
  error: string | null;
  demoCode?: string; // Only in demo mode
}

/**
 * Request a verification code to be sent to the email
 * @param email - User's email address
 * @param purpose - 'signup' or 'password_reset'
 */
export async function sendVerificationCode(
  email: string,
  purpose: 'signup' | 'password_reset'
): Promise<VerificationResponse> {
  try {
    // Call Edge Function to send verification email
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { email: email.toLowerCase(), purpose },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message || 'Failed to send verification code' };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.message || 'Failed to send verification code' };
    }

    // In demo mode, return the code for testing
    return {
      success: true,
      error: null,
      demoCode: data.demo_code, // Remove in production
    };
  } catch (err: any) {
    console.error('Send verification code error:', err);
    return { success: false, error: err.message || 'Failed to send verification code' };
  }
}

/**
 * Verify the code entered by the user
 * @param email - User's email address
 * @param code - 7-digit verification code
 * @param purpose - 'signup' or 'password_reset'
 */
export async function verifyCode(
  email: string,
  code: string,
  purpose: 'signup' | 'password_reset'
): Promise<VerificationResponse> {
  try {
    // Find matching verification code
    const { data, error } = await supabase
      .from('vk_email_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid or expired verification code' };
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from('vk_email_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('Failed to mark code as used:', updateError);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Verify code error:', err);
    return { success: false, error: err.message || 'Verification failed' };
  }
}

/**
 * Check if an email has been verified for signup
 * @param email - User's email address
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('vk_email_verifications')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('purpose', 'signup')
      .eq('is_used', true)
      .not('verified_at', 'is', null)
      .limit(1)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
