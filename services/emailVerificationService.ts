import { getSupabaseClient } from '@/template';

export interface VerificationResponse {
  success: boolean;
  error: string | null;
  demoCode?: string; // Only in demo mode
}

/**
 * Generate 7-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

/**
 * Request a verification code to be sent to the email
 * LOCAL MODE: Stores code in database, returns code for display (no actual email sent)
 * @param email - User's email address
 * @param purpose - 'signup' or 'password_reset'
 */
export async function sendVerificationCode(
  email: string,
  purpose: 'signup' | 'password_reset'
): Promise<VerificationResponse> {
  try {
    const supabase = getSupabaseClient();
    
    // Generate 7-digit code
    const code = generateVerificationCode();
    
    // Store code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('vk_email_verifications')
      .insert({
        email: email.toLowerCase(),
        code,
        purpose,
        expires_at: expiresAt,
      });

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Failed to store verification code' };
    }

    // LOCAL MODE: Return the code for display
    // In production with email service, remove demoCode and send via email
    console.log(`Verification code for ${email}: ${code}`);
    
    return {
      success: true,
      error: null,
      demoCode: code, // Remove when email service is integrated
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
    const supabase = getSupabaseClient();
    
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
    const supabase = getSupabaseClient();
    
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
