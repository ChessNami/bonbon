import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../../supabaseClient";

const UserSettings = () => {
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen"
        >
            <section className="bg-white rounded-xl shadow-2xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-4">
                    User Settings
                </h2>
                {(userRole === 1 || userRole === 3) && (
                    <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">View Mode</h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-600 font-medium">Admin View</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={viewMode === "user"}
                                    onChange={toggleViewMode}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600"></div>
                                <div className="absolute w-4 h-4 bg-white rounded-full top-1 left-1 transition-transform peer-checked:translate-x-5"></div>
                            </label>
                            <span className="text-gray-600 font-medium">User View</span>
                        </div>
                    </div>
                )}
                {(userRole !== 1 && userRole !== 3) && (
                    <p className="text-gray-600">No settings available for this user role.</p>
                )}
            </section>
        </motion.div>
    );
};

export default UserSettings;