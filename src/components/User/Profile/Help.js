import React from "react";

const Help = () => {
    return (
        <div>
            <h2 className="text-2xl font-bold">Help</h2>
            <p>This section provides guidance on how to use the Profile section.</p>
            <ul>
                <li><strong>My Account:</strong> View your account information including display name, email, and date created.</li>
                <li><strong>Account Settings:</strong> Change your email and password.</li>
                <li><strong>Resident Profiling:</strong> Submit a profiling request to the admin. (Work in progress)</li>
            </ul>
        </div>
    );
};

export default Help;