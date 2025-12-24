import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: '9e845a001@smtp-brevo.com',
        pass: 'xsmtpsib-809d9d03552e257334cba813987592788ee79f9f22f3568ce78db8aed43f65f7-gKgT4jZt0DjDu02T'
      }
    });

    await transporter.sendMail({
      from: '"e-RMT" <ermtnoreply@gmail.com>',
      to,
      subject,
      html
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}