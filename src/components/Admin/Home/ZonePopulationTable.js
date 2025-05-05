import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const ZonePopulationTable = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const autoSlideRef = useRef(null);
    const cardsPerPage = 3;

    // Initialize all zones (1 to 9) with zero population
    const initializeZones = () => {
        const allZones = Array.from({ length: 9 }, (_, i) => ({
            name: `Zone ${i + 1}`,
            population: 0,
        }));
        return allZones;
    };

    // Function to calculate zone populations
    const calculateZonePopulations = useCallback((residents) => {
        // Start with all zones initialized to zero
        const zoneCounts = initializeZones().reduce((acc, zone) => {
            acc[zone.name] = zone.population;
            return acc;
        }, {});

        residents.forEach((resident) => {
            // Household head
            if (resident.household && resident.household.zone) {
                const zone = resident.household.zone;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
            }

            // Spouse
            if (resident.spouse && Object.keys(resident.spouse).length > 0 && resident.spouse.zone) {
                const zone = resident.spouse.zone;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
            }

            // Household composition
            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") {
                        composition = JSON.parse(composition);
                    }

                    composition.forEach((member) => {
                        // Children with isLivingWithParents: "Yes"
                        if (member.isLivingWithParents === "Yes" && member.zone) {
                            const zone = member.zone;
                            zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                        }
                        // Other members (assume same zone as household head)
                        else if (!member.isLivingWithParents && resident.household.zone) {
                            const zone = resident.household.zone;
                            zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                        }
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });

        // Convert zoneCounts to array of { name, population }
        return Object.entries(zoneCounts)
            .map(([name, population]) => ({
                name,
                population,
            }))
            .sort((a, b) => {
                // Sort zones numerically based on the zone number
                const zoneA = parseInt(a.name.split(" ")[1]);
                const zoneB = parseInt(b.name.split(" ")[1]);
                return zoneA - zoneB;
            });
    }, []);

    // Function to fetch residents data
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
                const zoneData = calculateZonePopulations(data);
                setZones(zoneData);
            } else {
                // If no data, show all zones with zero population
                setZones(initializeZones());
            }
        } catch (err) {
            setError("Failed to fetch resident data");
            console.error(err);
            setZones(initializeZones()); // Show all zones even on error
        } finally {
            setLoading(false);
        }
    }, [calculateZonePopulations]);

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
                    fetchResidents();
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
                    fetchResidents();
                }
            )
            .subscribe();

        // Cleanup subscription
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchResidents]);

    const totalPages = Math.ceil(zones.length / cardsPerPage);

    const paginate = useCallback(
        (newDirection) => {
            setDirection(newDirection);
            setCurrentPage((prevPage) => {
                const nextPage = prevPage + newDirection;
                if (nextPage < 0) return totalPages - 1;
                if (nextPage >= totalPages) return 0;
                return nextPage;
            });
        },
        [totalPages]
    );

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDragEnd = useCallback(
        (event, info) => {
            setIsDragging(false);
            if (info.offset.x < -100) paginate(1);
            else if (info.offset.x > 100) paginate(-1);
        },
        [paginate]
    );

    const startAutoSlide = useCallback(() => {
        if (autoSlideRef.current) {
            clearInterval(autoSlideRef.current);
        }
        autoSlideRef.current = setInterval(() => {
            if (!isDragging) {
                paginate(1);
            }
        }, 3000);
    }, [isDragging, paginate]);

    useEffect(() => {
        startAutoSlide();
        return () => {
            if (autoSlideRef.current) {
                clearInterval(autoSlideRef.current);
            }
        };
    }, [currentPage, startAutoSlide]);

    const visibleZones = zones.slice(
        currentPage * cardsPerPage,
        currentPage * cardsPerPage + cardsPerPage
    );

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
        }),
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md w-full overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Zone Population of Barangay Bonbon</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => paginate(-1)}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition"
                    >
                        <FaChevronLeft />
                    </button>
                    <button
                        onClick={() => paginate(1)}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-600">Loading...</p>
            ) : error ? (
                <p className="text-center text-red-500">Error: {error}</p>
            ) : zones.length === 0 ? (
                <p className="text-center text-gray-600">No zone data available</p>
            ) : (
                <div className="w-full">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentPage}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                            style={{
                                cursor: isDragging ? "grabbing" : "grab",
                            }}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "tween", duration: 0.5 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            {visibleZones.map((zone, index) => (
                                <div
                                    key={index}
                                    className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow hover:shadow-md transition-shadow"
                                >
                                    <h3 className="text-lg font-semibold text-blue-900 mb-1">
                                        {zone.name}
                                    </h3>
                                    <p className="text-3xl font-bold text-blue-700">
                                        {zone.population}
                                    </p>
                                    <p className="text-sm text-blue-500">Residents</p>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default ZonePopulationTable;