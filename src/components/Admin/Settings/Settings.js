import React, { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa"; // Added FaEye, FaEyeSlash
import FooterConfig from "./FooterConfig";
import ExportData from "./ExportData";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import bcrypt from "bcryptjs";

const Settings = () => {
    const { viewMode, toggleViewMode } = useUser();
    const [userRole, setUserRole] = useState(null);
    const [passphrase, setPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState(""); // Added confirm passphrase state
    const [currentPassphrase, setCurrentPassphrase] = useState("");
    const [hasPassphrase, setHasPassphrase] = useState(false);
    const [isLoadingPassphrase, setIsLoadingPassphrase] = useState(false);
    const [showCurrentPassphrase, setShowCurrentPassphrase] = useState(false); // Toggle for current passphrase
    const [showNewPassphrase, setShowNewPassphrase] = useState(false); // Toggle for new passphrase
    const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false); // Toggle for confirm passphrase

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userRoleData, error } = await supabase
                    .from("user_roles")
                    .select("role_id")
                    .eq("user_id", user.id)
                    .single();

                if (!error) {
                    setUserRole(userRoleData.role_id);
                }
            }
        };

        const checkPassphrase = async () => {
            setIsLoadingPassphrase(true);
            const { data, error } = await supabase
                .from("settings")
                .select("value")
                .eq("key", "delete_passphrase_hash")
                .single();

            if (error || !data) {
                setHasPassphrase(false);
            } else {
                setHasPassphrase(!!data.value);
            }
            setIsLoadingPassphrase(false);
        };

        fetchUserRole();
        checkPassphrase();
    }, []);

    const handlePassphraseSubmit = async (e) => {
        e.preventDefault();
        if (!passphrase.trim()) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Passphrase is required',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true
            });
            return;
        }

        if (passphrase !== confirmPassphrase) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Passphrases do not match',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true
            });
            return;
        }

        try {
            setIsLoadingPassphrase(true);

            if (hasPassphrase) {
                // Verify current passphrase
                const { data: currentHash, error: fetchError } = await supabase
                    .from("settings")
                    .select("value")
                    .eq("key", "delete_passphrase_hash")
                    .single();

                if (fetchError || !currentHash) {
                    throw new Error("Failed to fetch current passphrase");
                }

                const isValid = bcrypt.compareSync(currentPassphrase, currentHash.value);
                if (!isValid) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Incorrect current passphrase',
                        showConfirmButton: false,
                        timer: 1500,
                        scrollbarPadding: false,
                        timerProgressBar: true
                    });
                    setIsLoadingPassphrase(false);
                    return;
                }
            }

            // Hash the new passphrase
            const hashedPassphrase = bcrypt.hashSync(passphrase, 10);

            // Upsert the passphrase into settings table
            const { error: upsertError } = await supabase
                .from("settings")
                .upsert({
                    key: "delete_passphrase_hash",
                    value: hashedPassphrase,
                }, { onConflict: 'key' });

            if (upsertError) {
                throw new Error("Failed to save passphrase");
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: hasPassphrase ? 'Passphrase updated successfully' : 'Passphrase created successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true
            });

            setHasPassphrase(true);
            setPassphrase("");
            setConfirmPassphrase("");
            setCurrentPassphrase("");
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message,
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true
            });
        } finally {
            setIsLoadingPassphrase(false);
        }
    };

    const fetchResidents = useCallback(async () => {
        // This will be provided by ExportData
    }, []);

    return (
        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <nav className="mb-8 bg-white shadow-lg rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <ul className="flex flex-col sm:flex-row gap-4 items-center">
                        <li>
                            <motion.a
                                href="#footer-settings"
                                className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md"
                                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                                whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            >
                                Footer Configuration
                            </motion.a>
                        </li>
                        <li>
                            <motion.a
                                href="#export-data"
                                className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md"
                                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                                whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            >
                                Export Data
                            </motion.a>
                        </li>
                        <li>
                            <motion.a
                                href="#passphrase-settings"
                                className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md"
                                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                                whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            >
                                Passphrase Management
                            </motion.a>
                        </li>
                    </ul>
                    {(userRole === 1 || userRole === 3) && (
                        <div className="flex items-center space-x-4">
                            <motion.button
                                onClick={toggleViewMode}
                                className={`px-4 py-2 rounded-lg font-semibold shadow-md ${viewMode === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                    }`}
                                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                                whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            >
                                {viewMode === "user" ? "Admin View" : "User View"}
                            </motion.button>
                        </div>
                    )}
                </div>
            </nav>
            <section id="passphrase-settings" className="mb-8 bg-white shadow-lg rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Passphrase Management</h2>
                {isLoadingPassphrase ? (
                    <div className="flex items-center justify-center py-4">
                        <FaSpinner className="animate-spin text-blue-600 text-2xl" />
                        <span className="ml-2 text-gray-600">Loading...</span>
                    </div>
                ) : (
                    <form onSubmit={handlePassphraseSubmit} className="space-y-4">
                        {hasPassphrase && (
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700">Current Passphrase</label>
                                <input
                                    type={showCurrentPassphrase ? "text" : "password"}
                                    value={currentPassphrase}
                                    onChange={(e) => setCurrentPassphrase(e.target.value)}
                                    className="mt-1 w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter current passphrase"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassphrase(!showCurrentPassphrase)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6 text-gray-500 hover:text-gray-700"
                                >
                                    {showCurrentPassphrase ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        )}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700">
                                {hasPassphrase ? "New Passphrase" : "Create Passphrase"}
                            </label>
                            <input
                                type={showNewPassphrase ? "text" : "password"}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="mt-1 w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={hasPassphrase ? "Enter new passphrase" : "Enter passphrase"}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassphrase(!showNewPassphrase)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6 text-gray-500 hover:text-gray-700"
                            >
                                {showNewPassphrase ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700">Confirm New Passphrase</label>
                            <input
                                type={showConfirmPassphrase ? "text" : "password"}
                                value={confirmPassphrase}
                                onChange={(e) => setConfirmPassphrase(e.target.value)}
                                className="mt-1 w-full p-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Confirm new passphrase"
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassphrase(!showConfirmPassphrase)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6 text-gray-500 hover:text-gray-700"
                            >
                                {showConfirmPassphrase ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <motion.button
                            type="submit"
                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md font-semibold shadow-md hover:bg-blue-700 disabled:bg-blue-400"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isLoadingPassphrase}
                        >
                            {isLoadingPassphrase ? (
                                <FaSpinner className="animate-spin text-xl" />
                            ) : hasPassphrase ? (
                                "Update Passphrase"
                            ) : (
                                "Create Passphrase"
                            )}
                        </motion.button>
                    </form>
                )}
            </section>
            <FooterConfig onFetchResidents={fetchResidents} />
            <ExportData onFetchResidents={fetchResidents} />
        </div>
    );
};

export default Settings;