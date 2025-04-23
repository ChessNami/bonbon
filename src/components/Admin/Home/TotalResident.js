import React, { useState, useEffect, useCallback } from "react";
import { FaUsers } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const TotalResident = () => {
    const [totalResidents, setTotalResidents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Memoize calculateTotalResidents
    const calculateTotalResidents = useCallback((residents) => {
        let total = 0;

        residents.forEach((resident) => {
            // Count household head (always 1 if record exists)
            total += 1;

            // Count spouse if present
            if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                total += 1;
            }

            // Count household composition members
            if (resident.household_composition) {
                try {
                    // Parse household_composition (JSON string or array)
                    let composition = resident.household_composition;
                    if (typeof composition === "string") {
                        composition = JSON.parse(composition);
                    }

                    composition.forEach((member) => {
                        // Count children with isLivingWithParents: "Yes" or other members
                        if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                            total += 1;
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
        // Initial fetch
        fetchResidents();

        // Set up real-time subscription
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
                    fetchResidents(); // Re-fetch data on any change
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "resident_profile_status",
                    filter: "status=eq.1", // Subscribe to changes for approved status
                },
                (payload) => {
                    console.log("Change detected in resident_profile_status:", payload);
                    fetchResidents(); // Re-fetch data on status change
                }
            )
            .subscribe();

        // Cleanup subscription on component unmount
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
                <h2 className="text-gray-600 text-lg">Total Residents</h2>
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