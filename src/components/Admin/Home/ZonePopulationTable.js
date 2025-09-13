import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaQuestionCircle } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const ZonePopulationTable = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef(null); // Ref for the tooltip div
    const autoSlideRef = useRef(null);
    const cardsPerPage = 3;

    // Handle clicks outside the tooltip
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
                setShowTooltip(false);
            }
        };

        // Add event listener when tooltip is open
        if (showTooltip) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        // Cleanup event listener
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showTooltip]);

    const initializeZones = () => {
        const allZones = Array.from({ length: 9 }, (_, i) => ({
            name: `Zone ${i + 1}`,
            population: 0,
        }));
        return allZones;
    };

    const calculateZonePopulations = useCallback((residents) => {
        const zoneCounts = initializeZones().reduce((acc, zone) => {
            acc[zone.name] = zone.population;
            return acc;
        }, {});

        residents.forEach((resident) => {
            if (resident.household && resident.household.zone) {
                const zone = resident.household.zone;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
            }

            if (resident.spouse && Object.keys(resident.spouse).length > 0 && resident.spouse.zone) {
                const zone = resident.spouse.zone;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
            }

            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") {
                        composition = JSON.parse(composition);
                    }

                    composition.forEach((member) => {
                        if (member.isLivingWithParents === "Yes" && member.zone) {
                            const zone = member.zone;
                            zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                        } else if (!member.isLivingWithParents && resident.household.zone) {
                            const zone = resident.household.zone;
                            zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
                        }
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });

        return Object.entries(zoneCounts)
            .map(([name, population]) => ({
                name,
                population,
            }))
            .sort((a, b) => {
                const zoneA = parseInt(a.name.split(" ")[1]);
                const zoneB = parseInt(b.name.split(" ")[1]);
                return zoneA - zoneB;
            });
    }, []);

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
                .eq("resident_profile_status.status", 1);

            if (error) {
                throw error;
            }

            if (data) {
                const zoneData = calculateZonePopulations(data);
                setZones(zoneData);
            } else {
                setZones(initializeZones());
            }
        } catch (err) {
            setError("Failed to fetch resident data");
            console.error(err);
            setZones(initializeZones());
        } finally {
            setLoading(false);
        }
    }, [calculateZonePopulations]);

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
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-800">Zone Population of Barangay Bonbon</h2>
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
                                    Population counts only include residents with an <span className="font-bold text-green-500">"APPROVED"</span> profiling status.
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
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