import { getSupabaseClient } from '@/template';
import Constants from 'expo-constants';

export interface VerificationResponse {
  success: boolean;
  error: string | null;
}

/**
 * Generate 7-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

/**
 * Request a verification code to be sent to the email
 * Stores code in database and sends email via Firebase Cloud Function
 * @param email - User's email address
 * @param purpose - 'signup' or 'password_reset'
 * @param name - Optional user name for email personalization
 */
export async function sendVerificationCode(
  email: string,
  purpose: 'signup' | 'password_reset',
  name?: string
): Promise<VerificationResponse> {
  try {
    const supabase = getSupabaseClient();
    
    // Generate 7-digit code
    const code = generateVerificationCode();
    
    // Store code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: dbError } = await supabase
      .from('vk_email_verifications')
      .insert({
        email: email.toLowerCase(),
        code,
        purpose,
        expires_at: expiresAt,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, error: 'Failed to store verification code' };
    }

    // Send email via Firebase Cloud Function
    const firebaseUrl = Constants.expoConfig?.extra?.firebaseEmailFunctionUrl || 
                        process.env.EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL;

    if (!firebaseUrl) {
      console.error('Firebase email function URL not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please contact support.' 
      };
    }

    const emailResponse = await fetch(firebaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        code,
        purpose,
        name,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Email sending failed:', errorData);
      return { 
        success: false, 
        error: errorData.error || 'Failed to send verification email' 
      };
    }

    console.log(`Verification email sent to ${email} for ${purpose}`);
    
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
