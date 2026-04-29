require('dotenv').config();

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpService = process.env.SMTP_SERVICE || 'gmail';
const fromAddress = process.env.SMTP_FROM || (smtpUser ? `برنامج المحاسبة <${smtpUser}>` : 'برنامج المحاسبة <no-reply@example.com>');

module.exports = {
    enabled: Boolean(smtpUser && smtpPass),
    smtp: {
        service: smtpService,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    },
    from: fromAddress
};
