/**
 * Cloudflare Worker: Email Subscription & Download Delivery
 * 
 * Handles email capture for QuickLoops Pro downloads.
 * - Validates email format
 * - Stores email in Cloudflare KV
 * - Sends download link via Brevo transactional email
 * 
 * SETUP:
 * 1. Create Worker in Cloudflare Dashboard
 * 2. Create KV namespace: QUICKLOOPS_EMAILS
 * 3. Add environment variables:
 *    - BREVO_API_KEY: Your Brevo API key
 *    - SENDER_EMAIL: Verified sender email (e.g., hello@pmoneymusic.com)
 *    - SENDER_NAME: Sender display name (e.g., QuickLoops Pro)
 * 4. Bind KV namespace as EMAILS_KV
 * 5. Add route: quickloopspro.pmoneymusic.com/api/*
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    const url = new URL(request.url);

    // Route: POST /api/subscribe
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }

    // Pass through other requests
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * Handle CORS preflight requests
 */
function handleCors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Add CORS headers to response
 */
function corsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200) {
  return corsHeaders(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Handle email subscription
 */
async function handleSubscribe(request, env) {
  try {
    // Parse request body
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    // Validate email
    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: 'Please provide a valid email address' }, 400);
    }

    // Check if already subscribed (optional - prevent duplicate emails)
    const existing = await env.EMAILS_KV.get(email);
    if (existing) {
      // Already subscribed - still send success (don't reveal if email exists)
      return jsonResponse({ success: true, message: 'Check your email for the download link' });
    }

    // Store email in KV
    const subscriptionData = {
      email,
      subscribedAt: new Date().toISOString(),
      source: 'quickloopspro',
      userAgent: request.headers.get('user-agent') || 'unknown',
      country: request.cf?.country || 'unknown'
    };
    
    await env.EMAILS_KV.put(email, JSON.stringify(subscriptionData));

    // Send download email via Brevo
    const emailSent = await sendDownloadEmail(email, env);
    
    if (!emailSent) {
      console.error('Failed to send email to:', email);
      // Still return success - email is stored, user can request resend
    }

    return jsonResponse({ 
      success: true, 
      message: 'Check your email for the download link' 
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
  }
}

/**
 * Send download email via Brevo API
 */
async function sendDownloadEmail(recipientEmail, env) {
  const BREVO_API_KEY = env.BREVO_API_KEY;
  const SENDER_EMAIL = env.SENDER_EMAIL || 'hello@pmoneymusic.com';
  const SENDER_NAME = env.SENDER_NAME || 'QuickLoops Pro';
  const DOWNLOAD_URL = 'https://quickloopspro.pmoneymusic.com/download/';

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return false;
  }

  const emailPayload = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [{ email: recipientEmail }],
    subject: 'Your QuickLoops Pro Download',
    htmlContent: generateEmailHtml(DOWNLOAD_URL),
    textContent: generateEmailText(DOWNLOAD_URL)
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Brevo API request failed:', error);
    return false;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(downloadUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your QuickLoops Pro Download</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; background: linear-gradient(180deg, #0071e3 0%, #005bb5 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                QuickLoops Pro
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">
                Your download is ready
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; color: #1d1d1f; font-size: 16px; line-height: 1.5;">
                Thanks for your interest in QuickLoops Pro! Click the button below to download the app.
              </p>
              
              <!-- Download Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${downloadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(180deg, #1f86ff, #0071e3); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 999px;">
                      Download QuickLoops Pro
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; color: #6e6e73; font-size: 14px; line-height: 1.5;">
                <strong>What's included:</strong>
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #6e6e73; font-size: 14px; line-height: 1.8;">
                <li>Dual independent looping decks</li>
                <li>MIDI Learn & speed control</li>
                <li>Pro audio routing for DJ mixers</li>
                <li>Native Apple Silicon performance</li>
              </ul>
              
              <p style="margin: 0; color: #6e6e73; font-size: 14px; line-height: 1.5;">
                QuickLoops Pro is free during active development. You'll receive updates as we add new features.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f5f5f7; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #86868b; font-size: 12px; text-align: center; line-height: 1.5;">
                Created by <a href="https://pmoneymusic.com" style="color: #0071e3; text-decoration: none;">P-Money</a><br>
                © ${new Date().getFullYear()} QuickLoops
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateEmailText(downloadUrl) {
  return `
QuickLoops Pro - Your Download is Ready
========================================

Thanks for your interest in QuickLoops Pro! 

Download here: ${downloadUrl}

What's included:
- Dual independent looping decks
- MIDI Learn & speed control
- Pro audio routing for DJ mixers
- Native Apple Silicon performance

QuickLoops Pro is free during active development. You'll receive updates as we add new features.

---
Created by P-Money
https://pmoneymusic.com
  `.trim();
}
