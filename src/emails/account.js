const sgMail = require('@sendgrid/mail');

const myDomainEmail = 'stmutasa@gmail.com';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: myDomainEmail,
        subject: 'Thank You for Signing up to Task Manager!',
        text: `Welcome to the app, ${name}. Let me know how you like the app`
    })
};

const sendCancelEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: myDomainEmail,
        subject: 'Sorry to see you go.',
        text: `Sorry to see you go ${name}. Is there anything we could have done to keep you?`
    })
};

// This is the way to export multiple things
module.exports = {
    sendWelcomeEmail,
    sendCancelEmail
};