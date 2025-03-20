import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../img/Logo/bonbon-logo.png";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import Swal from "sweetalert2";

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

    const handleLogin = async (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we log you in.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { user, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        Swal.close();

        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'User logged in successfully',
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
            console.log("User logged in:", user);
            onLoginSuccess();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Passwords do not match',
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
            return;
        }

        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we register your account.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
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
                icon: 'error',
                title: 'Oops...',
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        } else if (data.user) {
            // Assign the "user" role to the newly registered user
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert([{ user_id: data.user.id, role_id: 2 }]); // Assuming role_id 2 is for "user"

            if (roleError) {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: roleError.message,
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Registration successful. Please check your email to verify your account.',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });
                console.log("User registered and role assigned:", data.user);
            }
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we reset your password.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { error } = await supabase.auth.api.resetPasswordForEmail(email);

        Swal.close();

        if (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Password reset email sent',
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
            });
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
    };

    const switchToRegister = () => {
        clearForm();
        setIsLogin(false);
        setIsResetPassword(false);
    };

    const switchToResetPassword = () => {
        clearForm();
        setIsResetPassword(true);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-4xl bg-white rounded shadow-lg p-6">
                <div className="flex flex-col items-center justify-center w-full md:w-1/2 mb-6 md:mb-0">
                    <img src={logo} alt="Bonbon Logo" className="w-72 h-auto" />
                    <h2 className="text-xl font-bold mt-4">Welcome to Barangay Bonbon</h2>
                </div>
                <div className="flex flex-col items-center justify-center w-full md:w-1/2 transition-all duration-500 ease-in-out">
                    <h2 className="text-2xl font-bold mb-4 uppercase">
                        {isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
                    </h2>
                    <form
                        className="flex flex-col space-y-4 w-full"
                        onSubmit={isResetPassword ? handleResetPassword : isLogin ? handleLogin : handleRegister}
                    >
                        {!isLogin && !isResetPassword && (
                            <div className="flex space-x-4">
                                <div className="relative w-1/2">
                                    <FaUser className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        className="p-2 pl-10 border rounded w-full shadow-sm"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="relative w-1/2">
                                    <FaUser className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className="p-2 pl-10 border rounded w-full shadow-sm"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="email"
                                placeholder="Email"
                                className="p-2 pl-10 border rounded w-full shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {!isResetPassword && (
                            <>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        className="p-2 pl-10 border rounded w-full shadow-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 p-2 text-xl"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                                    </button>
                                </div>
                                {!isLogin && (
                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm Password"
                                            className="p-2 pl-10 border rounded w-full shadow-sm"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 p-2 text-xl"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex="-1"
                                        >
                                            {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <button type="submit" className={`p-2 text-white text-lg rounded uppercase font-bold transition duration-200 shadow-md ${isLogin ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"}`}>
                            {isResetPassword ? "Reset Password" : isLogin ? "Login" : "Register"}
                        </button>
                    </form>
                    <div className="mt-4 space-y-2 text-center">
                        {isResetPassword ? (
                            <>
                                Remembered your password?{" "}
                                <button onClick={switchToLogin} className="text-blue-500 uppercase font-bold transition duration-200 hover:text-blue-600">
                                    Login
                                </button>
                            </>
                        ) : isLogin ? (
                            <>
                                Don't have an account?{" "}
                                <button onClick={switchToRegister} className="text-blue-500 uppercase font-bold transition duration-200 hover:text-blue-600">
                                    Register
                                </button>
                                <br />
                                <div className="flex flex-col items-center mt-2">
                                    <span>Forgot your password?</span>
                                    <button onClick={switchToResetPassword} className="text-blue-500 uppercase font-bold transition duration-200 hover:text-blue-600">
                                        Reset Password
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button onClick={switchToLogin} className="text-blue-500 uppercase font-bold transition duration-200 hover:text-blue-600">
                                    Login
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;