// =====================================================
// Stripe Webhook Handler for FairPrep Subscriptions
// PUBLIC ENDPOINT - No auth required (uses Stripe signature verification)
// Captures checkout.session.completed events and writes to vk_premium_subscriptions
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    logStep("CORS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  try {
    logStep("Webhook received");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!webhookSecret) {
      logStep("WARNING: STRIPE_WEBHOOK_SECRET not set - signature verification disabled");
    }
    
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get signature and raw body
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify webhook signature (if secret is configured)
    let event: Stripe.Event;
    if (webhookSecret && signature) {
      try {
        // Use async version for Deno/Edge Functions environment
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified", { eventType: event.type });
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // No signature verification (development mode)
      event = JSON.parse(body);
      logStep("Webhook signature verification skipped (dev mode)", { eventType: event.type });
    }

    // Create Supabase admin client (service role for database writes)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        // Get metadata
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier as 'basic' | 'pro';

        if (!userId || !tier) {
          logStep("ERROR: Missing metadata", { userId, tier });
          return new Response(JSON.stringify({ error: "Missing user_id or tier in metadata" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get subscription ID from session
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          logStep("ERROR: No subscription ID in session");
          return new Response(JSON.stringify({ error: "No subscription ID in session" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Retrieve subscription to get correct 6-month period dates
        let subscription: Stripe.Subscription;
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
          logStep("Subscription retrieved", {
            subscriptionId: subscription.id,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            status: subscription.status,
          });
        } catch (err: any) {
          logStep("ERROR: Failed to retrieve subscription", { error: err.message });
          return new Response(JSON.stringify({ error: `Failed to retrieve subscription: ${err.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get vk_user.id from auth_user_id
        const { data: vkUser, error: userError } = await supabaseAdmin
          .from("vk_users")
          .select("id")
          .eq("auth_user_id", userId)
          .single();

        if (userError || !vkUser) {
          logStep("ERROR: Failed to find vk_user", { userId, error: userError });
          return new Response(JSON.stringify({ error: "User not found in vk_users table" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("VK user found", { vkUserId: vkUser.id });

        // Calculate dates - our plans are ALWAYS 6 months
        if (!subscription.current_period_start) {
          logStep("ERROR: Missing period start timestamp", {
            periodStart: subscription.current_period_start,
          });
          return new Response(JSON.stringify({ error: "Missing subscription start timestamp" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Start date from Stripe subscription
        const startDate = new Date(subscription.current_period_start * 1000);
        
        // End date = start date + 6 months (hardcoded for our 6-month plans)
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);
        
        logStep("Date calculation", {
          stripeCurrentPeriodEnd: subscription.current_period_end,
          calculatedStartDate: startDate.toISOString(),
          calculatedEndDate: endDate.toISOString(),
          monthsAdded: 6,
        });
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          logStep("ERROR: Invalid date conversion", {
            startTimestamp: subscription.current_period_start,
            endTimestamp: subscription.current_period_end,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
          });
          return new Response(JSON.stringify({ error: "Invalid time value" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Dates calculated", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        // Prepare subscription record
        const subscriptionRecord = {
          user_id: vkUser.id,
          subscription_tier: tier,
          price_aud: tier === 'basic' ? 20 : 40,
          duration_months: 6,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: session.payment_method_types?.[0] || 'card',
          payment_transaction_id: subscriptionId,
          payment_status: 'completed',
          auto_renew: true, // Stripe subscriptions auto-renew by default
        };

        logStep("Inserting subscription record", subscriptionRecord);

        // Insert into vk_premium_subscriptions
        const { data: insertedSub, error: insertError } = await supabaseAdmin
          .from("vk_premium_subscriptions")
          .insert(subscriptionRecord)
          .select()
          .single();

        if (insertError) {
          logStep("ERROR: Failed to insert subscription", { error: insertError });
          return new Response(JSON.stringify({ error: `Database insert failed: ${insertError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Subscription inserted successfully", { subscriptionId: insertedSub.id });

        // Update vk_users premium status
        const { error: updateError } = await supabaseAdmin
          .from("vk_users")
          .update({
            is_premium: true,
            premium_tier: tier,
            premium_expires_at: endDate.toISOString(),
            premium_auto_renew: true,
          })
          .eq("id", vkUser.id);

        if (updateError) {
          logStep("ERROR: Failed to update user premium status", { error: updateError });
        } else {
          logStep("User premium status updated", { vkUserId: vkUser.id, tier });
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        // Get user_id from metadata
        const userId = subscription.metadata?.user_id;
        if (!userId) {
          logStep("WARNING: No user_id in subscription metadata");
          break;
        }

        // Get vk_user
        const { data: vkUser } = await supabaseAdmin
          .from("vk_users")
          .select("id")
          .eq("auth_user_id", userId)
          .single();

        if (!vkUser) {
          logStep("WARNING: User not found", { userId });
          break;
        }

        // Update subscription record
        const endDate = new Date(subscription.current_period_end * 1000);
        const { error: updateError } = await supabaseAdmin
          .from("vk_premium_subscriptions")
          .update({
            end_date: endDate.toISOString(),
            payment_status: subscription.status === 'active' ? 'completed' : 'failed',
            cancelled_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          })
          .eq("user_id", vkUser.id)
          .eq("payment_status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        if (updateError) {
          logStep("ERROR: Failed to update subscription", { error: updateError });
        } else {
          logStep("Subscription updated successfully");
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted/cancelled", {
          subscriptionId: subscription.id,
        });

        // Get user_id from metadata
        const userId = subscription.metadata?.user_id;
        if (!userId) {
          logStep("WARNING: No user_id in subscription metadata");
          break;
        }

        // Get vk_user
        const { data: vkUser } = await supabaseAdmin
          .from("vk_users")
          .select("id")
          .eq("auth_user_id", userId)
          .single();

        if (!vkUser) {
          logStep("WARNING: User not found", { userId });
          break;
        }

        // Mark subscription as cancelled
        const { error: updateError } = await supabaseAdmin
          .from("vk_premium_subscriptions")
          .update({
            payment_status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            auto_renew: false,
          })
          .eq("user_id", vkUser.id)
          .eq("payment_status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        if (updateError) {
          logStep("ERROR: Failed to cancel subscription", { error: updateError });
        } else {
          logStep("Subscription cancelled successfully");
        }

        // Update user premium status to free
        const { error: userUpdateError } = await supabaseAdmin
          .from("vk_users")
          .update({
            is_premium: false,
            premium_tier: 'free',
            premium_auto_renew: false,
          })
          .eq("id", vkUser.id);

        if (userUpdateError) {
          logStep("ERROR: Failed to update user to free tier", { error: userUpdateError });
        } else {
          logStep("User downgraded to free tier");
        }

        break;
      }

      default:
        logStep("Unhandled event type", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Webhook handler failed", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
