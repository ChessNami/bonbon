import React, { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import FooterConfig from "./FooterConfig";
import ExportData from "./ExportData";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../../supabaseClient";

const Settings = () => {
    const { viewMode, toggleViewMode } = useUser();
    const [userRole, setUserRole] = useState(null);

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

        fetchUserRole();
    }, []);

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
            <FooterConfig onFetchResidents={fetchResidents} />
            <ExportData onFetchResidents={fetchResidents} />
        </div>
    );
};

export default Settings;