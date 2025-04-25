const express = require('express');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use TLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Send Approval Email
router.post('/send-approval', async (req, res) => {
    const { userId } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Approval',
            text: 'Dear Resident,\n\nYour resident profile has been approved.\n\nThank you,\nResident Management Team',
            html: '<p>Dear Resident,</p><p>Your resident profile has been <strong>approved</strong>.</p><p>Thank you,<br>Resident Management Team</p>',
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Approval email sent successfully' });
    } catch (error) {
        console.error('Error sending approval email:', error);
        res.status(500).json({ error: 'Failed to send approval email' });
    }
});

// Send Rejection Email
router.post('/send-rejection', async (req, res) => {
    const { userId, rejectionReason } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Rejection',
            text: `Dear Resident,\n\nYour resident profile has been rejected.\nReason: ${rejectionReason}\n\nPlease address the issue and resubmit.\n\nThank you,\nResident Management Team`,
            html: `<p>Dear Resident,</p><p>Your resident profile has been <strong>rejected</strong>.</p><p><strong>Reason:</strong> ${rejectionReason}</p><p>Please address the issue and resubmit.</p><p>Thank you,<br>Resident Management Team</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Rejection email sent successfully' });
    } catch (error) {
        console.error('Error sending rejection email:', error);
        res.status(500).json({ error: 'Failed to send rejection email' });
    }
});

// Send Pending Email
router.post('/send-pending', async (req, res) => {
    const { userId } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Submission',
            text: 'Dear Resident,\n\nYour resident profile has been submitted and is pending review.\n\nThank you,\nResident Management Team',
            html: '<p>Dear Resident,</p><p>Your resident profile has been submitted and is <strong>pending review</strong>.</p><p>Thank you,<br>Resident Management Team</p>',
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Pending email sent successfully' });
    } catch (error) {
        console.error('Error sending pending email:', error);
        res.status(500).json({ error: 'Failed to send pending email' });
    }
});

// Send Update Request Email
router.post('/send-update-request', async (req, res) => {
    const { userId, updateReason } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Update Request',
            text: `Dear Resident,\n\nAn update to your resident profile has been requested.\nReason: ${updateReason}\n\nPlease update your profile accordingly.\n\nThank you,\nResident Management Team`,
            html: `<p>Dear Resident,</p><p>An update to your resident profile has been <strong>requested</strong>.</p><p><strong>Reason:</strong> ${updateReason}</p><p>Please update your profile accordingly.</p><p>Thank you,<br>Resident Management Team</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Update request email sent successfully' });
    } catch (error) {
        console.error('Error sending update request email:', error);
        res.status(500).json({ error: 'Failed to send update request email' });
    }
});

// Send Update Profiling Email
router.post('/send-update-profiling', async (req, res) => {
    const { userId, updateReason } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Update Profiling Requested',
            text: `Dear Resident,\n\nAn update to your resident profile is required.\nReason: ${updateReason}\n\nPlease update your profile in the Resident Profiling section.\n\nThank you,\nResident Management Team`,
            html: `<p>Dear Resident,</p><p>An update to your resident profile is <strong>required</strong>.</p><p><strong>Reason:</strong> ${updateReason}</p><p>Please update your profile in the Resident Profiling section.</p><p>Thank you,<br>Resident Management Team</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Update profiling email sent successfully' });
    } catch (error) {
        console.error('Error sending update profiling email:', error);
        res.status(500).json({ error: 'Failed to send update profiling email' });
    }
});

// Send Update Request Approval Email
router.post('/send-update-approval', async (req, res) => {
    const { userId } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Update Approved',
            text: 'Dear Resident,\n\nYour profile update request has been approved.\n\nThank you,\nResident Management Team',
            html: '<p>Dear Resident,</p><p>Your profile update request has been <strong>approved</strong>.</p><p>Thank you,<br>Resident Management Team</p>',
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Update approval email sent successfully' });
    } catch (error) {
        console.error('Error sending update approval email:', error);
        res.status(500).json({ error: 'Failed to send update approval email' });
    }
});

// Send Update Request Rejection Email
router.post('/send-update-rejection', async (req, res) => {
    const { userId, rejectionReason } = req.body;

    try {
        // Fetch user email from Supabase auth
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user.user.email) {
            return res.status(400).json({ error: 'User not found or email not available' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: user.user.email,
            subject: 'Resident Profile Update Rejected',
            text: `Dear Resident,\n\nYour profile update request has been rejected.\nReason: ${rejectionReason}\n\nPlease address the issue and resubmit if necessary.\n\nThank you,\nResident Management Team`,
            html: `<p>Dear Resident,</p><p>Your profile update request has been <strong>rejected</strong>.</p><p><strong>Reason:</strong> ${rejectionReason}</p><p>Please address the issue and resubmit if necessary.</p><p>Thank you,<br>Resident Management Team</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Update rejection email sent successfully' });
    } catch (error) {
        console.error('Error sending update rejection email:', error);
        res.status(500).json({ error: 'Failed to send update rejection email' });
    }
});

module.exports = router;