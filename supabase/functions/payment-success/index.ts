// =====================================================
// Payment Success Handler for FairPrep Stripe Checkout
// Handles successful payment redirect from Stripe checkout
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-SUCCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment success handler started");

    // Parse URL parameters
    const url = new URL(req.url);
    const tier = url.searchParams.get("tier") || "basic";
    const sessionId = url.searchParams.get("session_id");

    logStep("Success parameters", { tier, sessionId });

    // HTML response with auto-redirect to app via deep link
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
          }
          .container {
            max-width: 400px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          p {
            margin: 0 0 30px 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .button {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .countdown {
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your ${tier === 'pro' ? 'Pro' : 'Basic'} subscription is now active. Thank you for upgrading!</p>
          <a href="fairprep://subscription/success?tier=${tier}" class="button">Return to App</a>
          <div class="countdown">Redirecting automatically in <span id="timer">3</span> seconds...</div>
        </div>
        
        <script>
          // Auto-redirect after 3 seconds
          let timeLeft = 3;
          const timerElement = document.getElementById('timer');
          
          const countdown = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
              clearInterval(countdown);
              window.location.href = 'fairprep://subscription/success?tier=${tier}';
            }
          }, 1000);
          
          // Also try immediate deep link
          setTimeout(() => {
            window.location.href = 'fairprep://subscription/success?tier=${tier}';
          }, 100);
        </script>
      </body>
      </html>
    `;

    logStep("Returning success page with auto-redirect");

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in payment-success", { message: errorMessage });
    
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
            padding: 20px;
          }
          .error {
            max-width: 400px;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>⚠️ Error</h1>
          <p>${errorMessage}</p>
          <a href="fairprep://subscription/cancel">Return to App</a>
        </div>
      </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 500,
    });
  }
});
