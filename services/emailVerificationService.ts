import { supabase } from './supabase';

export interface VerificationResponse {
  success: boolean;
  error: string | null;
}

/**
 * Request a verification code to be sent to the email
 * Calls the resend-verification-code Edge Function
 * @param email - User's email address
 * @param purpose - 'signup' or 'password_reset'
 */
export async function sendVerificationCode(
  email: string,
  purpose: 'signup' | 'password_reset' = 'signup'
): Promise<VerificationResponse> {
  try {
    console.log('📧 Calling resend-verification-code Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('resend-verification-code', {
      body: {
        email: email.toLowerCase(),
        purpose,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send verification code' 
      };
    }

    if (data?.error) {
      console.error('Edge Function returned error:', data.error);
      return { 
        success: false, 
        error: data.error 
      };
    }

    console.log('✅ Verification email sent successfully');
    
    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    console.error('Send verification code error:', err);
    return { 
      success: false, 
      error: err.message || 'Failed to send verification code' 
    };
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
    // Use the same external Supabase client as auth service
    
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
    // Use the same external Supabase client as auth service
    
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

/**
 * Verify code and activate user account (set is_verified = true)
 * @param email - User's email address
 * @param code - 7-digit verification code
 */
export async function verifyCodeAndActivateUser(
  email: string,
  code: string
): Promise<VerificationResponse> {
  try {
    // Use the same external Supabase client as auth service
    
    // First verify the code
    const verifyResult = await verifyCode(email, code, 'signup');
    if (!verifyResult.success) {
      return verifyResult;
    }

    // Update user's is_verified status
    const { error: updateError } = await supabase
      .from('vk_users')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('email', email.toLowerCase());

    if (updateError) {
      console.error('Failed to update user verification status:', updateError);
      return { 
        success: false, 
        error: 'Code verified but failed to update account status' 
      };
    }

    console.log(`User ${email} verified successfully`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Verify and activate user error:', err);
    return { 
      success: false, 
      error: err.message || 'Failed to verify account' 
    };
  }
}
