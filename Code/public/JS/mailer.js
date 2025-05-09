const nodemailer = require("nodemailer")

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: "vistaeguide@gmail.com",
    pass: "xdmg kvbb dcyn pumm",
  },
})

// Function to send verification email
const sendVerificationEmail = async (email, token, name) => {
  const verificationLink = `http://localhost:8080/verify-email?token=${token}`

  const mailOptions = {
    from: "vistaeguide@gmail.com",
    to: email,
    subject: "Verify Your Email - CareerGuide",
    html: `
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
    await transporter.sendMail(mailOptions)
    console.log(`Verification email sent to ${email}`)
    return true
  } catch (error) {
    console.error("Error sending verification email:", error)
    return false
  }
}

// Function to send password reset email
const sendPasswordResetEmail = async (email, token, name) => {
  const resetLink = `http://localhost:8080/reset-password?token=${token}`

  const mailOptions = {
    from: "vistaeguide@gmail.com",
    to: email,
    subject: "Reset Your Password - CareerGuide",
    html: `
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
    await transporter.sendMail(mailOptions)
    console.log(`Password reset email sent to ${email}`)
    return true
  } catch (error) {
    console.error("Error sending password reset email:", error)
    return false
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
}
