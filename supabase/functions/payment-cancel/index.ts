// =====================================================
// Payment Cancel Handler for FairPrep Stripe Checkout
// Handles cancelled/abandoned payment from Stripe checkout
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-CANCEL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment cancel handler started");

    // Parse URL parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    logStep("Cancel parameters", { sessionId });

    // HTML response with auto-redirect to app via deep link
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Cancelled</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
          }
          .container {
            max-width: 400px;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
            color: #333;
          }
          p {
            margin: 0 0 30px 0;
            font-size: 16px;
            color: #666;
            line-height: 1.5;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, background 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            background: #5568d3;
          }
          .countdown {
            margin-top: 20px;
            font-size: 14px;
            color: #999;
          }
          .note {
            margin-top: 20px;
            font-size: 14px;
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Payment Cancelled</h1>
          <p>Your payment was not completed. No charges have been made to your account.</p>
          <p>You can try again anytime from the Premium section of the app.</p>
          <a href="fairprep://subscription/cancel" class="button">Return to App</a>
          <div class="countdown">Redirecting automatically in <span id="timer">3</span> seconds...</div>
          <div class="note">Your data and current plan remain unchanged.</div>
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
              window.location.href = 'fairprep://subscription/cancel';
            }
          }, 1000);
          
          // Also try immediate deep link
          setTimeout(() => {
            window.location.href = 'fairprep://subscription/cancel';
          }, 100);
        </script>
      </body>
      </html>
    `;

    logStep("Returning cancel page with auto-redirect");

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error in payment-cancel", { message: errorMessage });
    
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
