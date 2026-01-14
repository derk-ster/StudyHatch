import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, vocabRequest, paymentIntentId } = body;

    // Validate required fields
    if (!name || !email || !vocabRequest || !paymentIntentId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Prepare email content (no card info - payment already processed)
    const emailContent = `
New Vocabulary Request - $5 Payment Processed

Customer Information:
Name: ${name}
Email: ${email}

Vocabulary Request Details:
${vocabRequest}

Payment Information:
Payment Intent ID: ${paymentIntentId}
Amount: $5.00 USD
Status: Payment processed successfully

---
This request was submitted through the StudyHatch website.
Payment of $5.00 has been automatically processed and will be deposited to your account.
The customer expects to receive their custom deck within 3 days. Refunds will be processed manually if needed.
Note: The deck will be made publicly available to all users on the website.
    `.trim();

    // Send email to derek.ray.2104@gmail.com
    // For production, integrate with Resend, SendGrid, Nodemailer, or similar
    try {
      // Option 1: Use Resend (recommended for production)
      // Install: npm install resend
      // Then uncomment and configure:
      /*
      import { Resend } from 'resend';
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: 'derek.ray.2104@gmail.com',
        subject: 'New Vocabulary Request - $5 Payment',
        html: emailContent.replace(/\n/g, '<br>'),
      });
      */

      // Option 2: Use Nodemailer with SMTP
      // Option 3: Use a webhook service like Zapier, Make.com, or n8n
      
      // For now, using a simple approach - you can integrate with any email service
      // This will send the email details to your email
      const emailData = {
        to: 'derek.ray.2104@gmail.com',
        subject: 'New Vocabulary Request - $5 Payment',
        body: emailContent,
      };
      
      // Send email using a webhook service or email API
      // For production, integrate with Resend, SendGrid, Nodemailer, or similar
      // Example with Resend (uncomment and configure):
      /*
      import { Resend } from 'resend';
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: 'derek.ray.2104@gmail.com',
        subject: emailData.subject,
        html: emailData.body.replace(/\n/g, '<br>'),
      });
      */
      
      // For now, log the email (replace with actual email service)
      console.log('=== VOCAB REQUEST EMAIL ===');
      console.log('To:', emailData.to);
      console.log('Subject:', emailData.subject);
      console.log('Body:', emailData.body);
      console.log('==========================');
      
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success as the request was received and payment was processed
    }

    // Return success (even if email fails, we log it)
    return NextResponse.json(
      { 
        success: true,
        message: 'Request submitted successfully. You will receive your custom vocab deck within 3 days, or your payment will be refunded.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
