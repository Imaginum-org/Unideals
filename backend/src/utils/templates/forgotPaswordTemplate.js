const forgotPasswordTemplate = ({ name, resetUrl }) => {
  return `
    <div style="font-family: 'Inter', 'Poppins', Arial, sans-serif; max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);">
      
      <div style="border-bottom: 1px solid #F1F5F9; padding: 32px 20px; text-align: center; border-top: 4px solid #2563EB; background-image: url('https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/HorizontalBorder.png?updatedAt=1779453128090'); background-size: cover; background-position: center;">
        <h1 style="color: #2563EB; font-size: 24px; font-weight: 700; margin: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: rgba(255, 255, 255, 0.95); padding: 8px 16px; border-radius: 8px;">
          <img src="https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Group%2014.png" alt="Logo" style="display: inline-block; height: 24px; vertical-align: middle; margin: 0;" />Unideals
        </h1>
      </div>

      <div style="padding: 32px 24px; text-align: center;">
        
        <div style="width: 64px; height: 64px; background-color: #EFF6FF; border-radius: 50%; margin: 0 auto 20px auto; position: relative; display: inline-flex; align-items: center; justify-content: center;">
          <img src="https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Icon.svg" alt="Icon" style="display: block; width: 32px; height: 32px;" />
          <div style="position: absolute; bottom: -6px; right: -6px; display: inline-flex; align-items: center; justify-content: center; background-color: #22C55E; color: white; border-radius: 50%; width: 24px; height: 24px; font-size: 12px; font-weight: bold; border: 2px solid white; line-height: 1;">
            ✓
          </div>
        </div>

        <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
          Reset Your Password
        </h2>

        <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi <strong>${name}</strong>,<br/> We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
        </p>

        <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 6px; margin-bottom: 24px;">
          Reset Password
        </a>

        <div style="background-color: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #64748B; font-size: 12px; margin: 0 0 8px 0;">
            If the button doesn't work,
          </p>
          <div style="background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 4px; padding: 10px;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">
              You can also <a href="${resetUrl}" style="color: #4F46E5; font-weight: 700; text-decoration: underline; word-break: break-all;">reset your password here.</a>
            </p>
          </div>
        </div>

        <div style="text-align: left; padding: 0 10px;">
          <p style="color: #94A3B8; font-size: 11px; line-height: 1.5; margin: 0;">
            <span style="font-size: 12px;">ⓘ</span> This link will expire in 15 min. If you didn't request a password reset, your account is safe and no action is needed.
          </p>
        </div>

      </div>

      <div style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px; text-align: center;">
        
        <div style="margin-bottom: 12px; color: #94A3B8; font-size: 14px;">
          <span style="margin: 0 8px;">❓</span>
          <span style="margin: 0 8px;">⚙️</span>
          <span style="margin: 0 8px;">🔒</span>
        </div>

        <p style="color: #94A3B8; font-size: 11px; line-height: 1.6; margin: 0 0 12px 0;">
          © 2026 Unideals Inc. All rights reserved.<br/>
          Bangalore, India
        </p>

        <p style="color: #94A3B8; font-size: 11px; margin: 0;">
          <a href="#" style="color: #94A3B8; text-decoration: none; font-weight: 500;">Privacy Policy</a> 
          <span style="margin: 0 8px;">•</span> 
          <a href="#" style="color: #94A3B8; text-decoration: none; font-weight: 500;">Terms of Service</a>
        </p>
      </div>

    </div>
  `;
};

export default forgotPasswordTemplate;
