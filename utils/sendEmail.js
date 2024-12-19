const nodemailer = require('nodemailer');

module.exports = async (email, subject, text) => {
    try {

        //Creating mail transporter object
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            service: process.env.EMAIL_SERVICE,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // port: 587,
            secure: false,
        });

        //Sending mail
        await transporter.sendMail({
            to: email,
            from: process.env.EMAIL_FROM,
            subject: subject,
            html: text,
        });

        console.log("Email sent")

    } catch (error) {
        console.log("Could not send email");
        console.log(error)
    }
}