import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners"; // Import ClipLoader from react-spinners

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const navigate = useNavigate();

    // Validate reset link
    useEffect(() => {
        const validateResetLink = async () => {
            setIsValidating(true);

            // Extract parameters from both query string and hash fragment
            const queryParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(
                window.location.hash.replace("#", "")
            );

            // Try query params first, then fall back to hash params
            const token = queryParams.get("access_token") || hashParams.get("access_token");
            const refreshToken = queryParams.get("refresh_token") || hashParams.get("refresh_token");

            if (!token) {
                console.error("No access token found in URL");
                Swal.fire({
                    icon: "error",
                    title: "Invalid Link",
                    text: "The password reset link is invalid or missing a token.",
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#ffe4e6",
                }).then(() => {
                    navigate("/auth");
                });
                return;
            }

            // Try to get the session
            let { data: { session }, error: sessionError } = await supabase.auth.getSession();

            // If no session, try to set it using the token
            if (!session && token) {
                const { error: setSessionError } = await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken || "",
                });
                if (setSessionError) {
                    console.error("Set Session Error:", setSessionError.message);
                }

                // Re-check the session after setting it
                const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();
                session = newSession;
                sessionError = newSessionError;
                console.log("Session after setSession:", newSession, "Error:", newSessionError);
            }

            if (sessionError || !session) {
                const errorMessage = sessionError?.message.includes("expired")
                    ? "The password reset link has expired. Please request a new one."
                    : "The password reset link is invalid or has expired.";
                console.error("Session Validation Failed:", sessionError?.message || "No session");
                Swal.fire({
                    icon: "error",
                    title: "Invalid or Expired Link",
                    text: errorMessage,
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#ffe4e6",
                }).then(() => {
                    navigate("/auth");
                });
                return;
            }

            setIsValidating(false);
        };

        validateResetLink();
    }, [navigate]);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Passwords do not match",
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#ffe4e6",
            });
            return;
        }

        setIsLoading(true);
        Swal.fire({
            title: "Processing...",
            text: "Please wait while we update your password.",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        Swal.close();
        setIsLoading(false);

        if (error) {
            const errorMessage =
                error.message.includes("invalid") || error.message.includes("expired")
                    ? "The password reset link is invalid or has expired."
                    : error.message;
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: errorMessage,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#ffe4e6",
            });
        } else {
            // Sign out to clear the session
            await supabase.auth.signOut();
            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Your password has been updated. Please log in.",
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#f0f9ff",
            }).then(() => {
                navigate("/auth");
            });
        }
    };

    // Animation variants for form
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } },
    };

    // Animation variants for input fields
    const inputVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
        }),
    };

    if (isValidating) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <ClipLoader color="#3b82f6" size={50} /> {/* Use ClipLoader from react-spinners */}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="reset-password"
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full"
                    >
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-700 mb-6 text-center uppercase">
                            Reset Your Password
                        </h2>
                        <form className="w-full space-y-4" onSubmit={handleResetPassword}>
                            <motion.div
                                className="relative"
                                variants={inputVariants}
                                custom={0}
                                initial="hidden"
                                animate="visible"
                            >
                                <FaLock className="absolute left-3 top-3.5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="New Password"
                                    className="w-full p-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    tabIndex={-1} // Prevent tabbing to the eye icon
                                >
                                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                                </button>
                            </motion.div>
                            <motion.div
                                className="relative"
                                variants={inputVariants}
                                custom={1}
                                initial="hidden"
                                animate="visible"
                            >
                                <FaLock className="absolute left-3 top-3.5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm New Password"
                                    className="w-full p-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                    tabIndex={-1} // Prevent tabbing to the eye icon
                                >
                                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                                </button>
                            </motion.div>
                            <motion.button
                                type="submit"
                                className="w-full py-2 text-white font-bold rounded-lg uppercase transition duration-200 shadow-md bg-blue-500 hover:bg-blue-600"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={isLoading}
                            >
                                Update Password
                            </motion.button>
                        </form>
                        <div className="mt-4 text-center text-sm text-gray-600">
                            <p>
                                Return to{" "}
                                <motion.button
                                    onClick={() => navigate("/auth")}
                                    className="text-blue-500 font-semibold hover:text-blue-600 transition duration-200"
                                    whileHover={{ scale: 1.05 }}
                                    disabled={isLoading}
                                >
                                    Login
                                </motion.button>
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ResetPassword;