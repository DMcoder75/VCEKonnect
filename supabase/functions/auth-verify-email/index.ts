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

    // Verify the code
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

    // Extract signup metadata
    const metadata = verification.metadata || {};
    const { password, name, year_level, state_id } = metadata;

    if (!password || !name) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase Auth user with verified email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Mark email as verified immediately
      user_metadata: {
        name,
        year_level: year_level || 11,
        state_id: state_id || 'vic',
      },
    });

    if (authError) {
      console.error('Failed to create auth user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create account: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark verification code as used
    await supabaseAdmin
      .from('vk_email_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    // The trigger handle_new_auth_user will automatically create vk_users entry

    // Sign in the user to get JWT tokens
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (sessionError || !sessionData.session) {
      console.error('Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Account created but failed to login. Please try logging in.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get vk_users profile (created by trigger)
    const { data: userProfile } = await supabaseAdmin
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        expiresIn: sessionData.session.expires_in,
        user: userProfile || {
          id: authData.user.id,
          email: authData.user.email,
          name,
          yearLevel: year_level || 11,
          stateId: state_id || 'vic',
        },
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
