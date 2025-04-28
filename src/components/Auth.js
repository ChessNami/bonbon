import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../img/Logo/bonbon-logo.png";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import Swal from "sweetalert2";
import { useUser } from "./contexts/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Auth = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isResetPassword, setIsResetPassword] = useState(false);
    const { setDisplayName } = useUser();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        Swal.fire({
            title: "Processing...",
            text: "Please wait while we log you in.",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        Swal.close();
        if (error) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#ffe4e6",
            });
        } else {
            const { data: userRoleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", user.id)
                .single();
            if (roleError) {
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: roleError.message,
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#ffe4e6",
                });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "User logged in successfully",
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#f0f9ff",
                });
                setDisplayName(user.user_metadata.display_name);
                onLoginSuccess(userRoleData.role_id, user.user_metadata.display_name);
                navigate("/");
            }
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
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
        Swal.fire({
            title: "Processing...",
            text: "Please wait while we register your account.",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: `${firstName} ${lastName}`,
                },
            },
        });
        Swal.close();
        if (error) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#ffe4e6",
            });
        } else if (data.user) {
            const { error: roleError } = await supabase
                .from("user_roles")
                .insert([{ user_id: data.user.id, role_id: 2 }]);
            if (roleError) {
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: roleError.message,
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#ffe4e6",
                });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "Registration successful. Please check your email to verify your account.",
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    background: "#f0f9ff",
                });
                switchToLogin();
            }
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        Swal.fire({
            title: "Processing...",
            text: "Please wait while we send the reset link.",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
        const redirectTo = `${window.location.origin}/reset-password`;
        console.log("RedirectTo URL:", redirectTo);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        });
        Swal.close();
        if (error) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#ffe4e6",
            });
        } else {
            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Password reset email sent. Please check your inbox, spam, and spamn folders.",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                background: "#f0f9ff",
            });
            switchToLogin();
        }
    };

    const clearForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFirstName("");
        setLastName("");
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const switchToLogin = () => {
        clearForm();
        setIsLogin(true);
        setIsResetPassword(false);
        navigate("/auth");
    };

    const switchToRegister = () => {
        clearForm();
        setIsLogin(false);
        setIsResetPassword(false);
        navigate("/auth");
    };

    const switchToResetPassword = () => {
        clearForm();
        setIsResetPassword(true);
        navigate("/auth");
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

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-6 overscroll-y-none touch-auto">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg flex flex-col md:flex-row overflow-hidden">
                {/* Logo and Welcome Section */}
                <motion.div
                    className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center bg-gray-50"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <img src={logo} alt="Bonbon Logo" className="w-48 sm:w-64 md:w-72 h-auto" />
                    <h2 className="text-lg sm:text-xl font-bold mt-4 text-center text-gray-700 uppercase">
                        Welcome To Barangay Bonbon
                    </h2>
                </motion.div>
                {/* Form Section */}
                <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isResetPassword ? "reset" : isLogin ? "login" : "register"}
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md"
                        >
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-700 mb-6 text-center uppercase">
                                {isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
                            </h2>
                            <form
                                className="w-full space-y-4 touch-auto"
                                onSubmit={isResetPassword ? handleResetPassword : isLogin ? handleLogin : handleRegister}
                            >
                                {!isLogin && !isResetPassword && (
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                                            <motion.div
                                                className="relative w-full sm:w-1/2"
                                                variants={inputVariants}
                                                custom={0}
                                                initial="hidden"
                                                animate="visible"
                                            >
                                                <FaUser className="absolute left-3 top-3.5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="First Name"
                                                    className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    required
                                                />
                                            </motion.div>
                                            <motion.div
                                                className="relative w-full sm:w-1/2"
                                                variants={inputVariants}
                                                custom={1}
                                                initial="hidden"
                                                animate="visible"
                                            >
                                                <FaUser className="absolute left-3 top-3.5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Last Name"
                                                    className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    required
                                                />
                                            </motion.div>
                                        </div>
                                    </>
                                )}
                                <motion.div
                                    className="relative"
                                    variants={inputVariants}
                                    custom={isLogin || isResetPassword ? 0 : 3}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <FaEnvelope className="absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </motion.div>
                                {!isResetPassword && (
                                    <>
                                        <motion.div
                                            className="relative"
                                            variants={inputVariants}
                                            custom={isLogin ? 1 : 4}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <FaLock className="absolute left-3 top-3.5 text-gray-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Password"
                                                className="w-full p-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-auto"
                                                onClick={() => setShowPassword(!showPassword)}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <FaEye /> : <FaEyeSlash />}
                                            </button>
                                        </motion.div>
                                        {!isLogin && (
                                            <motion.div
                                                className="relative"
                                                variants={inputVariants}
                                                custom={5}
                                                initial="hidden"
                                                animate="visible"
                                            >
                                                <FaLock className="absolute left-3 top-3.5 text-gray-400" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm Password"
                                                    className="w-full p-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm appearance-none"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-auto"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                                                </button>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                                <motion.button
                                    type="submit"
                                    className={`w-full py-2 text-white font-bold rounded-lg uppercase transition duration-200 shadow-md touch-auto ${isLogin ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
                                        }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isResetPassword ? "Send Reset Link" : isLogin ? "Login" : "Register"}
                                </motion.button>
                            </form>
                            <div className="mt-4 text-center text-sm text-gray-600 space-y-2">
                                {isResetPassword ? (
                                    <p>
                                        Remembered your password?{" "}
                                        <motion.button
                                            onClick={switchToLogin}
                                            className="text-blue-500 font-semibold hover:text-blue-600 transition duration-200 touch-auto"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            Login
                                        </motion.button>
                                    </p>
                                ) : isLogin ? (
                                    <>
                                        <p>
                                            Don't have an account?{" "}
                                            <motion.button
                                                onClick={switchToRegister}
                                                className="text-blue-500 font-semibold hover:text-blue-600 transition duration-200 touch-auto"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                Register
                                            </motion.button>
                                        </p>
                                        <p>
                                            Forgot your password?{" "}
                                            <motion.button
                                                onClick={switchToResetPassword}
                                                className="text-blue-500 font-semibold hover:text-blue-600 transition duration-200 touch-auto"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                Reset Password
                                            </motion.button>
                                        </p>
                                    </>
                                ) : (
                                    <p>
                                        Already have an account?{" "}
                                        <motion.button
                                            onClick={switchToLogin}
                                            className="text-blue-500 font-semibold hover:text-blue-600 transition duration-200 touch-auto"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            Login
                                        </motion.button>
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Auth;