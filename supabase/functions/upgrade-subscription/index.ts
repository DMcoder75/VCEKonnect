// =====================================================
// Stripe Subscription Upgrade/Downgrade Handler
// Handles tier changes with automatic proration
// Upgrades: Basic → Pro | Downgrades: Pro → Basic
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header not provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email unavailable");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { newTier } = await req.json();
    if (!newTier || !['basic', 'pro'].includes(newTier)) {
      throw new Error("Invalid tier. Must be 'basic' or 'pro'");
    }
    logStep("Request data", { newTier });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please create a subscription first.");
    }
    const customer = customers.data[0];
    logStep("Customer found", { customerId: customer.id });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found. Please create a subscription first.");
    }
    const subscription = subscriptions.data[0];
    logStep("Active subscription found", { 
      subscriptionId: subscription.id,
      currentStatus: subscription.status 
    });

    // Get current tier from metadata
    const currentTier = subscription.metadata?.tier;
    if (!currentTier) {
      throw new Error("Current subscription tier not found in metadata");
    }
    logStep("Current tier", { currentTier, newTier });

    // Check if tier is different
    if (currentTier === newTier) {
      throw new Error(`You are already subscribed to the ${newTier} plan`);
    }

    // Determine new price ID based on environment
    const newPriceId = newTier === 'basic'
      ? 'price_1TAx0tRIGJDaSBb0m9AQfQdr' // Basic $20 6-month
      : 'price_1TAx1bRIGJDaSBb0RVKx1Rjo'; // Pro $40 6-month
    
    logStep("Price IDs", { newPriceId, tier: newTier });

    // Get current subscription item
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw new Error("No subscription items found");
    }

    // Update subscription with proration
    logStep("Updating subscription with proration...");
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // Stripe automatically calculates proration
      metadata: {
        ...subscription.metadata,
        tier: newTier,
        upgraded_at: new Date().toISOString(),
        previous_tier: currentTier,
      },
    });

    logStep("Subscription updated successfully", {
      subscriptionId: updatedSubscription.id,
      newTier,
      prorationBehavior: 'create_prorations',
      status: updatedSubscription.status,
    });

    // Update database immediately (webhook will also update, but this gives instant feedback)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get vk_user.id from auth_user_id
    const { data: vkUser, error: userError } = await supabaseAdmin
      .from("vk_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!userError && vkUser) {
      // Update vk_users premium status
      await supabaseAdmin
        .from("vk_users")
        .update({
          premium_tier: newTier,
        })
        .eq("id", vkUser.id);

      // Update subscription record
      await supabaseAdmin
        .from("vk_premium_subscriptions")
        .update({
          subscription_tier: newTier,
          price_aud: newTier === 'basic' ? 20 : 40,
        })
        .eq("user_id", vkUser.id)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      logStep("Database updated", { vkUserId: vkUser.id, newTier });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully ${currentTier === 'basic' ? 'upgraded to Pro' : 'downgraded to Basic'}`,
        subscription: {
          id: updatedSubscription.id,
          tier: newTier,
          previousTier: currentTier,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in upgrade-subscription", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
