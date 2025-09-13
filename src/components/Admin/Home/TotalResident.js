import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaQuestionCircle } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const TotalResident = () => {
    const [totalResidents, setTotalResidents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false); // State for tooltip visibility
    const tooltipRef = useRef(null); // Ref for the tooltip div

    // Handle clicks outside the tooltip
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
                setShowTooltip(false);
            }
        };

        if (showTooltip) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showTooltip]);

    // Memoize calculateTotalResidents
    const calculateTotalResidents = useCallback((residents) => {
        let total = 0;

        residents.forEach((resident) => {
            total += 1; // Count household head

            if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                total += 1; // Count spouse
            }

            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") {
                        composition = JSON.parse(composition);
                    }

                    composition.forEach((member) => {
                        if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                            total += 1; // Count household members
                        }
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });

        return total;
    }, []);

    // Memoize fetchResidents
    const fetchResidents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("residents")
                .select(`
          household,
          spouse,
          household_composition,
          resident_profile_status!inner(status)
        `)
                .eq("resident_profile_status.status", 1); // Only fetch approved residents

            if (error) {
                throw error;
            }

            if (data) {
                const total = calculateTotalResidents(data);
                setTotalResidents(total);
            } else {
                setTotalResidents(0);
            }
        } catch (err) {
            setError("Failed to fetch resident data");
            console.error(err);
            setTotalResidents(0);
        } finally {
            setLoading(false);
        }
    }, [calculateTotalResidents]);

    useEffect(() => {
        fetchResidents();

        const subscription = supabase
            .channel("residents-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "residents",
                },
                (payload) => {
                    console.log("Change detected in residents:", payload);
                    fetchResidents();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "resident_profile_status",
                    filter: "status=eq.1",
                },
                (payload) => {
                    console.log("Change detected in resident_profile_status:", payload);
                    fetchResidents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchResidents]);

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-blue-500 text-white p-3 rounded-full">
                <FaUsers size={30} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-gray-600 text-lg">Total Residents</h2>
                    <div className="relative">
                        <FaQuestionCircle
                            className="text-gray-500 hover:text-gray-700 cursor-pointer"
                            size={18}
                            onClick={() => setShowTooltip(!showTooltip)}
                        />
                        <AnimatePresence>
                            {showTooltip && (
                                <motion.div
                                    ref={tooltipRef}
                                    className="absolute left-6 top-0 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 p-3 text-sm text-gray-700"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Total resident counts only include residents with an <span className="font-bold text-green-500">"APPROVED"</span> profiling status.
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {loading ? (
                    <p className="text-2xl font-bold">Loading...</p>
                ) : error ? (
                    <p className="text-2xl font-bold text-red-500">Error</p>
                ) : (
                    <p className="text-2xl font-bold">{totalResidents}</p>
                )}
            </div>
        </div>
    );
};

export default TotalResident;