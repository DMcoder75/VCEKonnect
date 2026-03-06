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

    console.log('🔐 [SIGNUP] Starting signup process');
    console.log('🔐 [SIGNUP] Email:', email);

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🔐 [SIGNUP] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('🔐 [SIGNUP] Service Role Key:', serviceRoleKey ? `SET (${serviceRoleKey.substring(0, 20)}...)` : 'NOT SET');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [SIGNUP] Missing environment variables!');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔐 [SIGNUP] Admin client created');

    // Check if email already exists
    console.log('🔐 [SIGNUP] Checking for existing user...');
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('vk_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [SIGNUP] Error checking existing user:', checkError);
    }

    if (existingUser) {
      console.log('❌ [SIGNUP] Email already exists');
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SIGNUP] Email is available');

    // STEP 1: Create user in auth.users (UNVERIFIED)
    console.log('🔐 [SIGNUP] Creating auth user...');
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
      console.error('❌ [SIGNUP] Failed to create auth user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create account: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SIGNUP] Auth user created:', authData.user.id);

    // STEP 2: Create vk_users entry using database function (SECURITY DEFINER bypasses RLS)
    console.log('🔐 [SIGNUP] Creating vk_users entry via database function...');
    console.log('🔐 [SIGNUP] Calling create_vk_user_profile with:', {
      p_auth_user_id: authData.user.id,
      p_email: email.toLowerCase(),
      p_name: name,
      p_year_level: yearLevel || 11,
      p_state_id: stateId || 'vic',
    });

    const { data: vkUserId, error: vkUserError } = await supabaseAdmin
      .rpc('create_vk_user_profile', {
        p_auth_user_id: authData.user.id,
        p_email: email.toLowerCase(),
        p_name: name,
        p_year_level: yearLevel || 11,
        p_state_id: stateId || 'vic',
      });

    if (vkUserError) {
      console.error('❌ [SIGNUP] Failed to create vk_users entry:', vkUserError);
      console.error('❌ [SIGNUP] Error code:', vkUserError.code);
      console.error('❌ [SIGNUP] Error message:', vkUserError.message);
      console.error('❌ [SIGNUP] Error details:', JSON.stringify(vkUserError, null, 2));
      
      // Rollback: delete auth user if vk_users creation fails
      console.log('🔄 [SIGNUP] Rolling back auth user...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + vkUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SIGNUP] vk_users entry created with ID:', vkUserId);

    // STEP 3: Generate 7-digit verification code
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('🔐 [SIGNUP] Generated verification code');

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
      console.error('❌ [SIGNUP] Failed to store verification code:', codeError);
      // Rollback: delete auth user if code storage fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SIGNUP] Verification code stored');

    // STEP 5: Send verification email via Firebase Cloud Function
    const firebaseEmailUrl = Deno.env.get('FIREBASE_EMAIL_FUNCTION_URL');
    if (!firebaseEmailUrl) {
      console.error('❌ [SIGNUP] FIREBASE_EMAIL_FUNCTION_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔐 [SIGNUP] Sending email via Firebase...');

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
      console.error('❌ [SIGNUP] Failed to send verification email:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [SIGNUP] Email sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent to email',
        requiresEmailVerification: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [SIGNUP] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
