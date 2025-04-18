import { Resend } from "resend";

import { config } from "dotenv";
config();

const apiKey = process.env.RESEND_API_KEY;
const resend = new Resend(apiKey);

export const sendOTPEmail = async ({
  to,
  otp,
}: {
  to: string;
  otp: string;
}) => {
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to: [to],
    subject: "Your OTP Code",
    html: `<strong>Your OTP code is ${otp}</strong>`,
  });

  if (error) {
    throw error;
  }

  console.log(data, "email data");

  return data;
};
