// =====================================================
// Payment Success Redirect Handler
// Redirects to deep link after successful Stripe payment
// =====================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const tier = url.searchParams.get("tier");

  console.log(`[PAYMENT-SUCCESS] Session: ${sessionId}, Tier: ${tier}`);

  // Return HTML that redirects to deep link and shows success message
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 48px 32px;
          text-align: center;
          max-width: 400px;
          margin: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: scaleIn 0.5s ease-out;
        }
        .checkmark {
          width: 40px;
          height: 40px;
          border: 4px solid white;
          border-radius: 50%;
          position: relative;
        }
        .checkmark:after {
          content: '';
          position: absolute;
          left: 8px;
          top: 4px;
          width: 12px;
          height: 20px;
          border: solid white;
          border-width: 0 4px 4px 0;
          transform: rotate(45deg);
        }
        h1 {
          color: #1f2937;
          font-size: 28px;
          margin: 0 0 16px;
          font-weight: 700;
        }
        p {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .loading {
          color: #667eea;
          font-weight: 600;
          font-size: 14px;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">
          <div class="checkmark"></div>
        </div>
        <h1>Payment Successful!</h1>
        <p>Your ${tier === 'pro' ? 'Pro' : 'Basic'} subscription is now active.</p>
        <p class="loading">Returning to app...</p>
      </div>
      <script>
        // Trigger deep link to close WebView and refresh subscription
        setTimeout(() => {
          window.location.href = 'fairprep://subscription/success?tier=${tier}';
          // Fallback: close window if deep link doesn't work
          setTimeout(() => {
            window.close();
          }, 1000);
        }, 2000);
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
