// =====================================================
// Resend Verification Code Edge Function
// Generates new code and sends email without creating new account
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  email: string;
  purpose?: 'signup' | 'password_reset';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, purpose = 'signup' }: ResendRequest = await req.json();

    console.log('📧 [RESEND] Starting resend process');
    console.log('📧 [RESEND] Email:', email);
    console.log('📧 [RESEND] Purpose:', purpose);

    // Validate email
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [RESEND] Missing environment variables!');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists
    console.log('📧 [RESEND] Checking if user exists...');
    const { data: user, error: userError } = await supabaseAdmin
      .from('vk_users')
      .select('id, email, name, auth_user_id')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log('❌ [RESEND] User not found');
      return new Response(
        JSON.stringify({ error: 'No account found with this email. Please sign up first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [RESEND] User found:', user.id);

    // Check if email is already verified (only for signup purpose)
    if (purpose === 'signup' && user.auth_user_id) {
      console.log('📧 [RESEND] Checking verification status...');
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.auth_user_id);
      
      if (!authError && authUser?.user?.email_confirmed_at) {
        console.log('✅ [RESEND] Email already verified');
        return new Response(
          JSON.stringify({ error: 'Email already verified. Please log in.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate new 7-digit verification code
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('📧 [RESEND] Generated new verification code');

    // Mark old codes as used (cleanup)
    await supabaseAdmin
      .from('vk_email_verifications')
      .update({ is_used: true })
      .eq('email', email.toLowerCase())
      .eq('purpose', purpose)
      .eq('is_used', false);

    // Store new verification code
    const { error: codeError } = await supabaseAdmin
      .from('vk_email_verifications')
      .insert({
        email: email.toLowerCase(),
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });

    if (codeError) {
      console.error('❌ [RESEND] Failed to store verification code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [RESEND] Verification code stored');

    // Send verification email via Firebase Cloud Function
    const firebaseEmailUrl = Deno.env.get('FIREBASE_EMAIL_FUNCTION_URL');
    if (!firebaseEmailUrl) {
      console.error('❌ [RESEND] FIREBASE_EMAIL_FUNCTION_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 [RESEND] Sending email via Firebase...');

    const emailResponse = await fetch(firebaseEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        code,
        purpose,
        name: user.name,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ [RESEND] Failed to send verification email:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [RESEND] Email sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'New verification code sent to email',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [RESEND] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
