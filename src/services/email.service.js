require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"AdvanceBackendTransaction" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to AdvanceBackendTransaction';
  const text = `Hello ${name},\n\nThank you for registering at AdvanceBackendTransaction. We're excited to have you on board!\n\nBest regards,\nThe AdvanceBackendTransaction Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at <strong>AdvanceBackendTransaction</strong>. We're excited to have you on board!</p><p>Best regards,<br>The AdvanceBackendTransaction Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendDebitTransactionEmail(userEmail, name, amount, fromAccount) {
  const subject = 'Amount Debited from Your Account';
  const text = `Hello ${name},\n\nAn amount of ${amount} has been debited from your account ${fromAccount}.\n\nBest regards,\nThe AdvanceBackendTransaction Team`;
  const html = `<p>Hello ${name},</p><p>An amount of <strong>${amount}</strong> has been debited from account <strong>${fromAccount}</strong>.</p><p>Best regards,<br>The AdvanceBackendTransaction Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendCreditTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = 'Amount Credited to Your Account';
  const text = `Hello ${name},\n\nAn amount of ${amount} has been credited to your account ${toAccount}.\n\nBest regards,\nThe AdvanceBackendTransaction Team`;
  const html = `<p>Hello ${name},</p><p>An amount of <strong>${amount}</strong> has been credited to account <strong>${toAccount}</strong>.</p><p>Best regards,<br>The AdvanceBackendTransaction Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendDebitTransactionFailureEmail(userEmail, name, amount, fromAccount) {
  const subject = 'Debit Transaction Failed';
  const text = `Hello ${name},\n\nYour transaction of ${amount} from account ${fromAccount} has failed. If any amount was debited, it will be refunded shortly.\n\nBest regards,\nThe AdvanceBackendTransaction Team`;
  const html = `<p>Hello ${name},</p><p>Your transaction of <strong>${amount}</strong> from account <strong>${fromAccount}</strong> has <strong style="color: red;">failed</strong>. If any amount was debited, it will be refunded shortly.</p><p>Best regards,<br>The AdvanceBackendTransaction Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}


module.exports = {
  sendRegistrationEmail,
  sendDebitTransactionEmail,
  sendCreditTransactionEmail,
  sendDebitTransactionFailureEmail
}