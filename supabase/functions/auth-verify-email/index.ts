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

    // STEP 2: Get the existing vk_users entry (created during signup)
    console.log('📧 [VERIFY] Looking up vk_users by email...');
    const { data: vkUser, error: vkUserLookupError } = await supabaseAdmin
      .from('vk_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (vkUserLookupError || !vkUser) {
      console.error('❌ [VERIFY] vk_users lookup failed:', vkUserLookupError);
      return new Response(
        JSON.stringify({ error: 'Account not found. Please sign up again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [VERIFY] Found vk_user:', vkUser.id);
    console.log('✅ [VERIFY] auth_user_id:', vkUser.auth_user_id);

    if (!vkUser.auth_user_id) {
      console.error('❌ [VERIFY] vk_user has no auth_user_id!');
      return new Response(
        JSON.stringify({ error: 'Account setup incomplete. Please sign up again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Mark verification code as used
    console.log('📧 [VERIFY] Marking verification code as used...');
    console.log('📧 [VERIFY] Verification ID:', verification.id);
    const { error: markUsedError } = await supabaseAdmin
      .from('vk_email_verifications')
      .update({
        is_used: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    if (markUsedError) {
      console.error('❌ [VERIFY] Failed to mark code as used:', markUsedError);
      return new Response(
        JSON.stringify({ error: 'Failed to update verification status: ' + markUsedError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [VERIFY] Verification code marked as used');

    // STEP 4: Update vk_users to mark as verified
    console.log('📧 [VERIFY] Updating vk_users table...');
    console.log('📧 [VERIFY] User ID:', vkUser.id);
    const { data: updateResult, error: vkUserUpdateError } = await supabaseAdmin
      .from('vk_users')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', vkUser.id)
      .select();

    if (vkUserUpdateError) {
      console.error('❌ [VERIFY] Failed to update vk_users:', vkUserUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user verification status: ' + vkUserUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [VERIFY] vk_users updated:', updateResult);

    // STEP 5: Update auth.users to mark email as verified
    console.log('📧 [VERIFY] Updating auth.users email verification...');
    console.log('📧 [VERIFY] Updating user:', vkUser.auth_user_id);
    const { data: updatedAuthUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      vkUser.auth_user_id,
      { email_confirm: true }
    );

    if (updateAuthError) {
      console.error('❌ [VERIFY] Failed to verify email in auth.users:', updateAuthError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify email: ' + updateAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [VERIFY] auth.users email verified:', updatedAuthUser.user.email_confirmed_at);

    // STEP 6: Use updated vk_users profile
    console.log('📧 [VERIFY] Using updated user profile...');
    const userProfile = updateResult && updateResult.length > 0 ? updateResult[0] : vkUser;

    console.log('✅ [VERIFY] Email verification complete!');
    console.log('✅ [VERIFY] All tables updated:', {
      'vk_email_verifications': 'is_used=true, verified_at=set',
      'vk_users': 'is_verified=true, verified_at=set',
      'auth.users': 'email_confirmed_at=set'
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: 'Verified Successfully! Login to start',
        user: userProfile,
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
