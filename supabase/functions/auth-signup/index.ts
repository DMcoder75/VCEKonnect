// =====================================================
// Firebase-Compatible Signup with Supabase Auth
// Flow: Create verification code → Send email → Return pending state
// Actual auth.users creation happens AFTER email verification
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  yearLevel?: number;
  stateId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, name, yearLevel, stateId }: SignupRequest = await req.json();

    // Validate inputs
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password validation
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase Admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔐 [SIGNUP] Using service role - RLS bypassed');

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('vk_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 1: Create user in auth.users (UNVERIFIED)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: false, // NOT verified yet
      user_metadata: {
        name,
        year_level: yearLevel || 11,
        state_id: stateId || 'vic',
      },
    });

    if (authError) {
      console.error('Failed to create auth user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create account: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Create vk_users entry directly (bypasses RLS with admin client)
    const { error: vkUserError } = await supabaseAdmin
      .from('vk_users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase(),
        name,
        year_level: yearLevel || 11,
        state_id: stateId || 'vic',
        is_premium: false,
        premium_tier: 'free',
      });

    if (vkUserError) {
      console.error('Failed to create vk_users entry:', vkUserError);
      // Rollback: delete auth user if vk_users creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + vkUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Generate 7-digit verification code
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // STEP 4: Store verification code
    const { error: codeError } = await supabaseAdmin
      .from('vk_email_verifications')
      .insert({
        email: email.toLowerCase(),
        code,
        purpose: 'signup',
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });

    if (codeError) {
      console.error('Failed to store verification code:', codeError);
      // Rollback: delete auth user if code storage fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 5: Send verification email via Firebase Cloud Function
    const firebaseEmailUrl = Deno.env.get('FIREBASE_EMAIL_FUNCTION_URL');
    if (!firebaseEmailUrl) {
      console.error('FIREBASE_EMAIL_FUNCTION_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await fetch(firebaseEmailUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        code,
        purpose: 'signup',
        name,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send verification email:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent to email',
        requiresEmailVerification: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
