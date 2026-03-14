// =====================================================
// Stripe Webhook Handler for FairPrep
// Handles subscription events and updates database
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Initialize Supabase with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id });
        
        if (session.mode === "subscription") {
          await handleSubscriptionCreated(session, supabaseClient, stripe);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { 
          type: event.type,
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        await handleSubscriptionUpdated(subscription, supabaseClient, stripe);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });
        await handleSubscriptionCancelled(subscription, supabaseClient);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id });
        await handlePaymentSucceeded(invoice, supabaseClient, stripe);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });
        await handlePaymentFailed(invoice, supabaseClient);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionCreated(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe
) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier || 'basic';
  
  if (!userId) {
    logStep("No user_id in session metadata");
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const startDate = new Date(subscription.current_period_start * 1000);
  const endDate = new Date(subscription.current_period_end * 1000);
  const priceAmount = subscription.items.data[0].price.unit_amount || 0;
  
  logStep("Creating subscription record", { userId, tier });

  // Get vk_user by auth_user_id
  const { data: vkUser, error: vkUserError } = await supabase
    .from('vk_users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (vkUserError || !vkUser) {
    logStep("Failed to find vk_user", { error: vkUserError?.message });
    return;
  }

  // Insert subscription record
  const { error: insertError } = await supabase
    .from('vk_premium_subscriptions')
    .insert({
      user_id: vkUser.id,
      subscription_tier: tier,
      price_aud: priceAmount / 100, // Convert cents to dollars
      duration_months: 6,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_method: session.payment_method_types?.[0] || 'card',
      payment_transaction_id: subscriptionId,
      payment_status: 'completed',
      auto_renew: !subscription.cancel_at_period_end,
    });

  if (insertError) {
    logStep("Failed to insert subscription", { error: insertError.message });
  } else {
    logStep("Subscription record created successfully");
  }

  // Update vk_users table
  const { error: updateError } = await supabase
    .from('vk_users')
    .update({
      premium_tier: tier,
      premium_expires_at: endDate.toISOString(),
      premium_auto_renew: !subscription.cancel_at_period_end,
    })
    .eq('id', vkUser.id);

  if (updateError) {
    logStep("Failed to update vk_users", { error: updateError.message });
  } else {
    logStep("vk_users updated successfully");
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  stripe: Stripe
) {
  const userId = subscription.metadata?.user_id;
  const tier = subscription.metadata?.tier || 'basic';
  
  if (!userId) {
    logStep("No user_id in subscription metadata");
    return;
  }

  const endDate = new Date(subscription.current_period_end * 1000);

  // Get vk_user by auth_user_id
  const { data: vkUser, error: vkUserError } = await supabase
    .from('vk_users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (vkUserError || !vkUser) {
    logStep("Failed to find vk_user", { error: vkUserError?.message });
    return;
  }

  // Update subscription record
  const { error: updateSubError } = await supabase
    .from('vk_premium_subscriptions')
    .update({
      end_date: endDate.toISOString(),
      auto_renew: !subscription.cancel_at_period_end,
      payment_status: subscription.status === 'active' ? 'completed' : 'pending',
    })
    .eq('payment_transaction_id', subscription.id);

  if (updateSubError) {
    logStep("Failed to update subscription", { error: updateSubError.message });
  }

  // Update vk_users table
  const { error: updateUserError } = await supabase
    .from('vk_users')
    .update({
      premium_tier: subscription.status === 'active' ? tier : 'free',
      premium_expires_at: endDate.toISOString(),
      premium_auto_renew: !subscription.cancel_at_period_end,
    })
    .eq('id', vkUser.id);

  if (updateUserError) {
    logStep("Failed to update vk_users", { error: updateUserError.message });
  }
}

async function handleSubscriptionCancelled(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    logStep("No user_id in subscription metadata");
    return;
  }

  // Get vk_user by auth_user_id
  const { data: vkUser, error: vkUserError } = await supabase
    .from('vk_users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (vkUserError || !vkUser) {
    logStep("Failed to find vk_user", { error: vkUserError?.message });
    return;
  }

  // Update subscription record
  const { error: updateSubError } = await supabase
    .from('vk_premium_subscriptions')
    .update({
      cancelled_at: new Date().toISOString(),
      auto_renew: false,
      payment_status: 'cancelled',
    })
    .eq('payment_transaction_id', subscription.id);

  if (updateSubError) {
    logStep("Failed to update subscription", { error: updateSubError.message });
  }

  // Update vk_users table
  const { error: updateUserError } = await supabase
    .from('vk_users')
    .update({
      premium_tier: 'free',
      premium_auto_renew: false,
    })
    .eq('id', vkUser.id);

  if (updateUserError) {
    logStep("Failed to update vk_users", { error: updateUserError.message });
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any,
  stripe: Stripe
) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    logStep("No user_id in subscription metadata");
    return;
  }

  // Get vk_user by auth_user_id
  const { data: vkUser, error: vkUserError } = await supabase
    .from('vk_users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (vkUserError || !vkUser) {
    logStep("Failed to find vk_user", { error: vkUserError?.message });
    return;
  }

  // Update payment status
  const { error: updateError } = await supabase
    .from('vk_premium_subscriptions')
    .update({
      payment_status: 'completed',
    })
    .eq('payment_transaction_id', subscription.id);

  if (updateError) {
    logStep("Failed to update payment status", { error: updateError.message });
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  if (!invoice.subscription) return;

  // Update payment status to failed
  const { error: updateError } = await supabase
    .from('vk_premium_subscriptions')
    .update({
      payment_status: 'failed',
    })
    .eq('payment_transaction_id', invoice.subscription);

  if (updateError) {
    logStep("Failed to update payment status", { error: updateError.message });
  }
}
