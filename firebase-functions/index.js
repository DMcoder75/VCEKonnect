const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Fairprep_email - Sends verification emails for FairPrep app
 * 
 * Request body:
 * {
 *   email: string,
 *   code: string,
 *   purpose: 'signup' | 'password_reset',
 *   name?: string (optional, for personalization)
 * }
 */
exports.Fairprep_email = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
      const { email, code, purpose, name } = req.body;

      // Validate required fields
      if (!email || !code || !purpose) {
        return res.status(400).json({
          error: 'Missing required fields: email, code, purpose'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate purpose
      if (!['signup', 'password_reset'].includes(purpose)) {
        return res.status(400).json({
          error: 'Invalid purpose. Must be "signup" or "password_reset"'
        });
      }

      // Configure email transporter
      // IMPORTANT: Set these environment variables in Firebase Console
      // firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password"
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: functions.config().email?.user || process.env.EMAIL_USER,
          pass: functions.config().email?.pass || process.env.EMAIL_PASSWORD,
        },
      });

      // Prepare email content based on purpose
      const emailContent = getEmailContent(purpose, code, name, email);

      // Send email
      const mailOptions = {
        from: `FairPrep by Dalsi Academy <${functions.config().email?.user || process.env.EMAIL_USER}>`,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      await transporter.sendMail(mailOptions);

      console.log(`Verification email sent to ${email} for ${purpose}`);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({
        error: 'Failed to send email',
        details: error.message
      });
    }
  });
});

/**
 * Generate email content based on purpose
 */
function getEmailContent(purpose, code, name, email) {
  const greeting = name ? `Hi ${name}` : 'Hello';
  
  if (purpose === 'signup') {
    return {
      subject: 'Verify Your FairPrep Account - Verification Code Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; border-top: none; }
            .code-box { background: #f5f5f5; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
            .info { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 FairPrep</h1>
              <p>by Dalsi Academy</p>
            </div>
            <div class="content">
              <h2>${greeting}! 👋</h2>
              <p>Thank you for signing up for FairPrep! You're one step away from starting your ATAR journey.</p>
              
              <p><strong>Your verification code is:</strong></p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <div class="info">
                <strong>⏱ Important:</strong> This code expires in 10 minutes.
              </div>
              
              <p>Enter this code in the FairPrep app to verify your email address and complete your account setup.</p>
              
              <p><strong>Didn't sign up for FairPrep?</strong><br>
              If you didn't create this account, you can safely ignore this email. The verification code will expire automatically.</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #666; font-size: 14px;">
                <strong>What's next?</strong><br>
                After verifying your email, you'll set up your subjects, goals, and start tracking your study progress toward your target ATAR.
              </p>
            </div>
            <div class="footer">
              <p>FairPrep - Australian Secondary School Study Tracker</p>
              <p>Powered by Dalsi Academy</p>
              <p style="margin-top: 15px;">
                <a href="#" style="color: #888; text-decoration: none;">Help</a> |
                <a href="#" style="color: #888; text-decoration: none;">Privacy</a> |
                <a href="#" style="color: #888; text-decoration: none;">Terms</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${greeting}!

Thank you for signing up for FairPrep by Dalsi Academy!

Your verification code is: ${code}

This code expires in 10 minutes. Enter it in the FairPrep app to verify your email and complete your account setup.

Didn't sign up for FairPrep? You can safely ignore this email.

---
FairPrep - Australian Secondary School Study Tracker
Powered by Dalsi Academy
      `.trim()
    };
  } else {
    // password_reset
    return {
      subject: 'Reset Your FairPrep Password - Verification Code Inside',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; border-top: none; }
            .code-box { background: #fff3cd; border: 2px dashed #ff9800; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ff9800; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 FairPrep</h1>
              <p>by Dalsi Academy</p>
            </div>
            <div class="content">
              <h2>${greeting}! 🔐</h2>
              <p>We received a request to reset your FairPrep password.</p>
              
              <p><strong>Your password reset code is:</strong></p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⏱ Important:</strong> This code expires in 10 minutes.
              </div>
              
              <p>Enter this code in the FairPrep app to verify your identity and create a new password.</p>
              
              <p><strong>Didn't request a password reset?</strong><br>
              If you didn't make this request, your account is still secure. You can safely ignore this email. The code will expire automatically.</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #666; font-size: 14px;">
                <strong>Security Tip:</strong><br>
                Never share your verification code with anyone. FairPrep staff will never ask for your code.
              </p>
            </div>
            <div class="footer">
              <p>FairPrep - Australian Secondary School Study Tracker</p>
              <p>Powered by Dalsi Academy</p>
              <p style="margin-top: 15px;">
                <a href="#" style="color: #888; text-decoration: none;">Help</a> |
                <a href="#" style="color: #888; text-decoration: none;">Privacy</a> |
                <a href="#" style="color: #888; text-decoration: none;">Terms</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${greeting}!

We received a request to reset your FairPrep password.

Your password reset code is: ${code}

This code expires in 10 minutes. Enter it in the FairPrep app to create a new password.

Didn't request a password reset? You can safely ignore this email.

Security Tip: Never share your verification code with anyone. FairPrep staff will never ask for your code.

---
FairPrep - Australian Secondary School Study Tracker
Powered by Dalsi Academy
      `.trim()
    };
  }
}
