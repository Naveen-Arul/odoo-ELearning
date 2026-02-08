require('dotenv').config({ path: '../.env' });
const emailService = require('../services/emailService');

const testEmail = async () => {
    console.log('--- Testing Email Configuration ---');
    console.log('Provider:', process.env.EMAIL_SERVICE_PROVIDER);
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('User:', process.env.EMAIL_USERNAME);
    console.log('Secure:', process.env.EMAIL_SECURE);

    if (!process.env.EMAIL_PASSWORD) {
        console.error('❌ Error: EMAIL_PASSWORD is missing in .env');
        return;
    }

    console.log('\nInitializing email service...');
    emailService.initialize();

    // Give it a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!emailService.initialized) {
        console.error('❌ Failed to initialize email service. Check your credentials.');
        return;
    }

    const testRecipient = process.argv[2] || process.env.EMAIL_USERNAME;
    console.log(`\nSending test email to: ${testRecipient}`);

    const result = await emailService.sendEmail({
        to: testRecipient,
        subject: 'SkillForge AI - Test Email',
        html: '<h1>It Works!</h1><p>Your email service is correctly configured.</p>'
    });

    if (result.success) {
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
    } else {
        console.error('❌ Failed to send email:', result.error);
    }
};

testEmail();
