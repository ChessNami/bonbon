import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const AccountSettings = () => {
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [retypeNewPassword, setRetypeNewPassword] = useState("");

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showRetypeNewPassword, setShowRetypeNewPassword] = useState(false);

    const showLoading = (message) => {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
    };

    const showAlert = (type, message) => {
        Swal.fire({
            icon: type,
            title: message,
            timer: 1500,
            showConfirmButton: false,
        });
    };

    // Email Change Handler
    const handleEmailChange = async (e) => {
        e.preventDefault();
        if (!email) {
            showAlert("error", "Email cannot be empty!");
            return;
        }

        showLoading("Sending confirmation email...");

        const { error } = await supabase.auth.updateUser({ email });

        if (error) {
            showAlert("error", error.message);
        } else {
            showAlert("success", "Confirmation email sent! Verify to complete the change.");
        }
    };



    // Password Change Handler with Reauthentication
    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !retypeNewPassword) {
            showAlert("error", "All password fields are required!");
            return;
        }

        if (newPassword === currentPassword) {
            showAlert("error", "New password cannot be the same as the current password!");
            return;
        }

        if (newPassword !== retypeNewPassword) {
            showAlert("error", "Passwords do not match!");
            return;
        }

        if (newPassword.length < 8) {
            showAlert("error", "Password must be at least 8 characters long!");
            return;
        }

        showLoading("Verifying current password...");

        // Get current user session
        const { data: user, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            showAlert("error", "User not authenticated!");
            return;
        }

        // Reauthenticate user by signing in again
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.user.email,
            password: currentPassword,
        });

        if (signInError) {
            showAlert("error", "Incorrect current password!");
            return;
        }

        showLoading("Updating password...");

        // Now update password after reauthentication
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
            showAlert("error", updateError.message);
        } else {
            showAlert("success", "Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setRetypeNewPassword("");
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-4 text-gray-700">Account Settings</h2>

            {/* Email Update Form */}
            <form onSubmit={handleEmailChange} className="mb-6">
                <label className="block font-medium text-gray-600 mb-1">New Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    type="submit"
                    className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md transition duration-200"
                >
                    Change Email
                </button>
            </form>

            {/* Password Update Form */}
            <form onSubmit={handlePasswordChange}>
                {/* Current Password */}
                <label className="block font-medium text-gray-600 mb-1">Current Password</label>
                <div className="relative">
                    <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        type="button"
                        tabIndex="-1"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-3 text-gray-600"
                    >
                        {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                {/* New Password */}
                <label className="block font-medium text-gray-600 mt-3 mb-1">New Password</label>
                <div className="relative">
                    <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        type="button"
                        tabIndex="-1"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-gray-600"
                    >
                        {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                {/* Retype New Password */}
                <label className="block font-medium text-gray-600 mt-3 mb-1">Retype New Password</label>
                <div className="relative">
                    <input
                        type={showRetypeNewPassword ? "text" : "password"}
                        value={retypeNewPassword}
                        onChange={(e) => setRetypeNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        type="button"
                        tabIndex="-1"
                        onClick={() => setShowRetypeNewPassword(!showRetypeNewPassword)}
                        className="absolute right-3 top-3 text-gray-600"
                    >
                        {showRetypeNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>

                <button
                    type="submit"
                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-md transition duration-200"
                >
                    Change Password
                </button>
            </form>
        </div>
    );
};

export default AccountSettings;
