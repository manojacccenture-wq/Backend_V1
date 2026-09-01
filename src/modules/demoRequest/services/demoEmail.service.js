import { sendEmail } from "../../../shared/services/email/email.service.js"

const generateRequesterHtml = (fullName) => `
  <h3>Hello ${fullName},</h3>
  <p>We have successfully received your demo request! Our team will review it and provision your 14-day trial access shortly.</p>
  <p>Thank you,<br/>MSaaS Team</p>
`;

const generateSuperAdminHtml = ({ fullName, companyName, workEmail, phoneNumber, useCase }) => `
  <h3>New Demo Request Alert</h3>
  <p><strong>Name:</strong> ${fullName}</p>
  <p><strong>Company:</strong> ${companyName}</p>
  <p><strong>Email:</strong> ${workEmail}</p>
  <p><strong>Phone:</strong> ${phoneNumber || "N/A"}</p>
  <p><strong>Use Case:</strong> ${useCase || "N/A"}</p>
`;

export const sendDemoRequestNotifications = (demoData) => {
  const { fullName, workEmail } = demoData;

  Promise.allSettled([
    sendEmail({
      to: workEmail,
      subject: "Request Received - MSaaS Demo",
      html: generateRequesterHtml(fullName),
    }),
    sendEmail({
      to: "manojacccenture@gmail.com",
      subject: "New Lead - MSaaS Demo Request",
      html: generateSuperAdminHtml(demoData),
    }),
  ]).then((results) => {
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Email dispatch failed for ${index === 0 ? "requester" : "SuperAdmin"}:`,
          result.reason
        );
      }
    });
  }).catch((err) => {
    console.error("Critical error in email dispatch process:", err);
  });
};



const generateTrialActivationHtml = ({
  companyName,
  email,
  password,
}) => `
  <div style="font-family: Arial; padding: 20px;">

    <h2>Welcome to MSaaS 🚀</h2>

    <p>Your trial account has been activated successfully.</p>

    <p>
      <strong>Company:</strong> ${companyName}
    </p>

    <p>
      <strong>Email:</strong> ${email}
    </p>

    <p>
      <strong>Temporary Password:</strong> ${password}
    </p>

    <p>
      Login Here:
    </p>

    <a href="${process.env.FRONTEND_URL}">
      ${process.env.FRONTEND_URL}
    </a>

    <br /><br />

    <p>
      Please change your password after first login.
    </p>

    <p>
      Thank you,<br/>
      MSaaS Team
    </p>

  </div>
`;

export const sendTrialActivation = async ({
  companyName,
  email,
  password,
}) => {

  return sendEmail({
    to: email,

    subject: "Your MSaaS Trial Account is Ready",

    html: generateTrialActivationHtml({
      companyName,
      email,
      password,
    }),
  });
};