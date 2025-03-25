import React, { useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const AccountSettings = () => {
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [retypeNewPassword, setRetypeNewPassword] = useState("");

    const handleEmailChange = async (e) => {
        e.preventDefault();
        // Add logic to change email
        Swal.fire("Email changed successfully!", "", "success");
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== retypeNewPassword) {
            Swal.fire("Passwords do not match!", "", "error");
            return;
        }
        // Add logic to change password
        Swal.fire("Password changed successfully!", "", "success");
    };

    return (
        <div>
            <h2 className="text-2xl font-bold">Account Settings</h2>
            <form onSubmit={handleEmailChange}>
                <div>
                    <label>Email:</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit">Change Email</button>
            </form>
            <form onSubmit={handlePasswordChange}>
                <div>
                    <label>Current Password:</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div>
                    <label>New Password:</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div>
                    <label>Retype New Password:</label>
                    <input type="password" value={retypeNewPassword} onChange={(e) => setRetypeNewPassword(e.target.value)} required />
                </div>
                <button type="submit">Change Password</button>
            </form>
        </div>
    );
};

export default AccountSettings;