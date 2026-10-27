import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Safely parse JWT payload claims without third-party dependencies
 */
function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP code
 */
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const min = 100000;
  const max = 999999;
  const range = max - min + 1;
  const code = min + (array[0] % range);
  return code.toString();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or malformed Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 1. Authenticate user with Supabase Auth via their Bearer token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract session_id strictly from verified JWT claims
    const jwtClaims = parseJwtPayload(token);
    const sessionId = jwtClaims?.session_id;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED: Verified JWT does not contain a valid session identifier' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Privileged admin client with service_role (Used ONLY inside server function)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, '');

    // ------------------------------------------------------------------------
    // ENDPOINT 1: REQUEST OTP (Triggered ONLY after successful password auth)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && pathname.endsWith('/request-otp')) {
      // Fail closed if email delivery is not configured
      if (!resendApiKey) {
        return new Response(
          JSON.stringify({
            error: 'EMAIL_SERVICE_UNCONFIGURED: Email provider secret (RESEND_API_KEY) is not configured in Supabase. Verification code cannot be dispatched.',
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate random 6-digit cryptographic OTP code
      const otpCode = generateSecureOtp();

      // Invoke server-side procedure with service_role to generate salt & hash
      const { data: challenge, error: challengeError } = await adminClient.rpc(
        'create_mfa_challenge',
        {
          p_user_id: user.id,
          p_session_id: sessionId,
          p_otp_code: otpCode,
        }
      );

      if (challengeError) {
        return new Response(
          JSON.stringify({ error: challengeError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const destinationEmail = challenge.destination_email || user.email;
      if (!destinationEmail) {
        return new Response(
          JSON.stringify({ error: 'User does not have a registered email address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Dispatch Email via Resend
      let emailRes;
      try {
        emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'DukaanSaathi Security <auth@dukaansaathi.in>',
            to: destinationEmail,
            subject: 'Your DukaanSaathi Verification Code',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; color: #102A43;">
                <h2 style="color: #00B9F1; margin-top: 0;">DukaanSaathi Second-Factor Verification</h2>
                <p style="font-size: 14px; line-height: 20px;">Namaste! Use this one-time code to complete login for your merchant store account:</p>
                <div style="background-color: #F8FAFC; border: 1.5px dashed #00B9F1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #102A43;">${otpCode}</span>
                </div>
                <p style="font-size: 12px; color: #64748B;">This code is valid for 1 hour. Never share your OTP with anyone.</p>
              </div>
            `,
          }),
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: `Email transport network failure: ${err?.message || 'Unable to connect to email provider'}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!emailRes.ok) {
        const errorBody = await emailRes.text();
        return new Response(
          JSON.stringify({ error: `Email delivery failed by provider: ${errorBody}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return safe metadata to client (Never return the OTP code!)
      return new Response(
        JSON.stringify({
          challenge_id: challenge.challenge_id,
          masked_email: challenge.masked_email,
          resend_after: challenge.resend_after,
          expires_at: challenge.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ------------------------------------------------------------------------
    // ENDPOINT 2: VERIFY OTP (Server validates code hash & grants session access)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && pathname.endsWith('/verify-otp')) {
      const body = await req.json().catch(() => ({}));
      const { challenge_id, otp_code } = body;

      if (!challenge_id || !otp_code) {
        return new Response(
          JSON.stringify({ error: 'Missing challenge_id or otp_code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify challenge strictly bound to this user and session
      const { data, error } = await adminClient.rpc('verify_mfa_challenge', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_challenge_id: challenge_id,
        p_otp_code: otp_code.toString().trim(),
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified_at: data.verified_at,
          session_id: data.session_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ------------------------------------------------------------------------
    // ENDPOINT 3: STATUS (Checks whether active session has verified MFA)
    // ------------------------------------------------------------------------
    if (req.method === 'GET' && pathname.endsWith('/status')) {
      const { data: isVerified } = await userClient.rpc('is_mfa_verified');
      return new Response(
        JSON.stringify({ is_mfa_verified: Boolean(isVerified) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
