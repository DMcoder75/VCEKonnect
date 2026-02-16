// Edge Function proxy for DalsiAI API
// Bypasses CORS restrictions in web preview

const DALSI_API_KEY = 'sk-dalsi-b2b6c7d012b1cbac235c7aeef7c2b9191ec6fdbe7226bc3db1e1880ab8cd6bf6';
const DALSI_API_BASE = 'https://api.neodalsi.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, mode = 'medium', user_id } = await req.json();

    // Forward request to DalsiAI API
    const response = await fetch(`${DALSI_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DALSI_API_KEY,
      },
      body: JSON.stringify({
        message,
        mode,
        user_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DalsiAI API error:', response.status, errorText);
      // Always return 200 to mobile with error details in body
      return new Response(
        JSON.stringify({ 
          error: `API Error ${response.status}`,
          details: errorText,
          response: `Unable to generate response. API returned error ${response.status}.`
        }),
        {
          status: 200, // Return 200 to avoid "non-2xx status code" error on mobile
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    // Always return 200 to mobile with error details in body
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack,
        response: 'Unable to generate response. Internal server error.'
      }),
      {
        status: 200, // Return 200 to avoid "non-2xx status code" error on mobile
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
