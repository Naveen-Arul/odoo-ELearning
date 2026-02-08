/**
 * SkillForge AI - Email Service
 * Automated email reminders using Nodemailer
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the email transporter
   */
  initialize() {
    try {
      const provider = process.env.EMAIL_SERVICE_PROVIDER || 'gmail';

      const rawHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const hostLooksLikeEmail = rawHost.includes('@');
      const host = hostLooksLikeEmail ? 'smtp.gmail.com' : rawHost;

      const rawUser = process.env.EMAIL_USERNAME || '';
      const authUser = rawUser.includes('@')
        ? rawUser
        : (hostLooksLikeEmail ? rawHost : rawUser);

      const port = parseInt(process.env.EMAIL_PORT) || 587;
      let secure = process.env.EMAIL_SECURE
        ? process.env.EMAIL_SECURE === 'true'
        : port === 465;

      if (port === 587) {
        secure = false;
      }

      if (port === 465) {
        secure = true;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: authUser,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      this.initialized = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.initialized || !this.transporter) {
      console.warn('Email service not initialized. Skipping email.');
      return { success: false, message: 'Email service not initialized' };
    }

    if (!process.env.EMAIL_PASSWORD) {
      return { success: false, error: 'Email password not configured' };
    }

    try {
      const mailOptions = {
        from: `"SkillForge AI" <${process.env.EMAIL_USERNAME}>`,
        to,
        subject,
        html,
        text: text || subject
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error.message);
      return { success: false, error: error.message };
    }
  }


  /**
   * Send roadmap enrollment email
   */
  async sendCourseEnrollmentEmail(user, roadmap) {
    const subject = `Welcome to ${roadmap.title} - SkillForge AI`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f9; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .roadmap-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .roadmap-title { color: #2d3748; font-size: 20px; font-weight: 600; margin-bottom: 10px; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; transition: background 0.3s; }
          .btn:hover { background: #5a67d8; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Your New Journey! 🚀</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>You've successfully enrolled in the <strong>${roadmap.title}</strong> roadmap. We're excited to help you master new skills!</p>
            
            <div class="roadmap-card">
              <div class="roadmap-title">${roadmap.title}</div>
              <p>Get ready to dive into ${roadmap.topics?.length || 'various'} comprehensive topics designed to boost your career.</p>
            </div>

            <p>Your learning journey starts now. Consistency is key!</p>

            <center>
              <a href="${process.env.CLIENT_URL}/roadmaps/${roadmap._id}" class="btn">Start Learning Now</a>
            </center>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SkillForge AI. All rights reserved.</p>
            <p>Keep learning, keep growing.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  /**
   * Send roadmap completion congratulation
   */
  async sendRoadmapCompletionEmail(user, roadmap) {
    const subject = '🎉 Congratulations! Roadmap Completed - SkillForge AI';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .achievement { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
          .btn { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <p>You've completed a roadmap!</p>
          </div>
          <div class="content">
            <h2>Amazing work, ${user.name}! 🌟</h2>

            <div class="achievement">
              <h3>🏆 Roadmap Completed</h3>
              <h2>${roadmap.title}</h2>
              <p>You've successfully completed all topics!</p>
            </div>

            <h3>What's Next?</h3>
            <ul>
              <li>🎯 Check out related roadmaps</li>
              <li>💼 Try a mock interview with our AI Interviewer</li>
              <li>📊 Analyze your career profile</li>
            </ul>

            <center>
              <a href="${process.env.CLIENT_URL}/roadmaps" class="btn">Explore More Roadmaps</a>
              <a href="${process.env.CLIENT_URL}/interview" class="btn">Take Mock Interview</a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  /**
   * Send hiring stage update email
   */
  async sendHiringUpdate({ to, subject, template, data }) {
    if (!template) return;

    // Replace placeholders in template (simple replacement)
    // Supported placeholders: {{candidate_name}}, {{job_title}}, {{company_name}}, {{round_name}}
    let html = template
      .replace(/{{candidate_name}}/g, data.candidateName || 'Candidate')
      .replace(/{{job_title}}/g, data.jobTitle || 'Job')
      .replace(/{{company_name}}/g, data.companyName || 'Company')
      .replace(/{{round_name}}/g, data.roundName || '');

    // Basic HTML wrapper if not present
    if (!html.includes('<html>')) {
      html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                ${html}
            </div>
        </body>
        </html>
        `;
    }

    return await this.sendEmail({
      to,
      subject: subject || `Update regarding your application for ${data.jobTitle}`,
      html
    });
  }

}

module.exports = new EmailService();
