// Import the Nodemailer module to send emails
const nodemailer = require("nodemailer")

// Create a reusable transporter object using Gmail as the email service provider
const transporter = nodemailer.createTransport({
  service: "gmail", // SMTP provider used to send emails (can be changed to others like SendGrid, Outlook, etc.)
  auth: {
    user: "vistaeguide@gmail.com", // Sender email address used for authentication
    pass: "xdmg kvbb dcyn pumm",    // App-specific password or access token for the Gmail account
  },
})

// Asynchronous function to send an email with a verification link
const sendVerificationEmail = async (email, token, name) => {
  // Construct the email verification URL using the token
  const verificationLink = `http://localhost:8080/verify-email?token=${token}`

  // Define the structure and content of the email to be sent
  const mailOptions = {
    from: "vistaeguide@gmail.com", // Sender address shown in the email
    to: email,                     // Recipient's email address
    subject: "Verify Your Email - CareerGuide", // Email subject line
    html: `
      <!-- HTML email template content starts here -->
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3b82f6;">Welcome to CareerGuide!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up with CareerGuide. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p>If the button above doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't sign up for CareerGuide, please ignore this email.</p>
        <p>Best regards,<br>The CareerGuide Team</p>
      </div>
    `,
  }

  try {
    // Attempt to send the email using the configured transporter
    await transporter.sendMail(mailOptions)
    console.log(`Verification email sent to ${email}`) // Log success to the console
    return true
  } catch (error) {
    // Catch and log any errors encountered during sending
    console.error("Error sending verification email:", error)
    return false
  }
}

// Asynchronous function to send a password reset email to the user
const sendPasswordResetEmail = async (email, token, name) => {
  // Generate a password reset link with the user's token
  const resetLink = `http://localhost:8080/reset-password?token=${token}`

  // Define the email's metadata and HTML structure
  const mailOptions = {
    from: "vistaeguide@gmail.com", // Sender email address
    to: email,                     // Target recipient
    subject: "Reset Your Password - CareerGuide", // Subject line for password reset
    html: `
      <!-- HTML content for the password reset email -->
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3b82f6;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your CareerGuide account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button above doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The CareerGuide Team</p>
      </div>
    `,
  }

  try {
    // Send the reset email using the defined transporter
    await transporter.sendMail(mailOptions)
    console.log(`Password reset email sent to ${email}`) // Log confirmation to console
    return true
  } catch (error) {
    // Print any error encountered during the process
    console.error("Error sending password reset email:", error)
    return false
  }
}

// Export the email functions so they can be used in other parts of the application
module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
}
