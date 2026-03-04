// =====================================================
// Email Verification → Create Supabase Auth User
// After code verification, creates auth.users entry with verified email
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  email: string;
  code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // STEP 1: Verify the code
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('vk_email_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('purpose', 'signup')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Get the existing auth.users entry (created during signup)
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(
      email.toLowerCase()
    );

    if (getUserError || !authUser) {
      console.error('Auth user not found:', getUserError);
      return new Response(
        JSON.stringify({ error: 'Account not found. Please sign up again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Update auth.users to mark email as verified
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.user.id,
      { email_confirm: true }
    );

    if (updateAuthError) {
      console.error('Failed to verify email:', updateAuthError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify email: ' + updateAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 4: Mark verification code as used
    await supabaseAdmin
      .from('vk_email_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    // STEP 5: Email verified successfully
    console.log(`Email verified for user: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: 'Email verified successfully! You can now log in.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
