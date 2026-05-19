const forgotPasswordTemplate = ({ name, resetUrl }) => {
  return `
    <div style="font-family: 'Inter', 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);">
      
      <div style="background-color: #F8FAFC; border-bottom: 1px solid #F1F5F9; padding: 32px 20px; text-align: center;">
        <h1 style="color: #364EF2; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">Unideals</h1>
      </div>

      <div style="padding: 40px 32px; text-align: center;">
        
        <div style="background-color: #EFF6FF; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 24px auto; display: inline-block; line-height: 64px; font-size: 28px;">
          🛡️
        </div>

        <h2 style="color: #0F172A; font-size: 26px; font-weight: 700; margin: 0 0 16px 0;">
          Your Verification Code
        </h2>

        <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; max-width: 400px; margin-left: auto; margin-right: auto;">
          Thank you <strong>${name}</strong> for signing up for our platform! We're excited to have you on board.
        </p>

        <div style="background-color: #394FF1; color: #ffffff; border: 1px solid #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <a href="${resetUrl}" target="_blank" style="color: #1E293B; font-size: 24px; font-family: 'Liberation Mono', Courier, monospace; font-weight: 700; letter-spacing: 4px; text-decoration: none; display: block; word-wrap: break-word;">
            RESET PASSWORD
          </a>
        </div>


        <div style="display: inline-block; background-color: #F8FAFC; border-radius: 50px; padding: 8px 16px;">
          <span style="color: #94A3B8; font-size: 14px; font-weight: 500;">⏱️ This code is valid for 10 minutes</span>
        </div>

      </div>

      <div style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
        <p style="color: #64748B; font-size: 14px; margin: 0 0 16px 0;">
          Need help? <a href="#" style="color: #394FF1; text-decoration: none; font-weight: 600;">Contact Support</a>
        </p>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin: 0;">
          © 2026 SecureFlow Inc. All rights reserved.<br/>
          123 Security Blvd, Tech City, TC 90210
        </p>
      </div>

    </div>
  `;
};

export default forgotPasswordTemplate;
