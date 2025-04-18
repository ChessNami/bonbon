import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const ZonePopulationTable = () => {
    const [zones, setZones] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const autoSlideRef = useRef(null);
    const cardsPerPage = 3;

    useEffect(() => {
        const zoneNames = [
            "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5",
            "Zone A", "Zone B", "Zone C", "Zone D"
        ];

        const randomZones = zoneNames.map(zone => ({
            name: zone,
            population: Math.floor(Math.random() * (500 - 100 + 1)) + 100,
        }));

        setZones(randomZones);
    }, []);

    const totalPages = Math.ceil(zones.length / cardsPerPage);

    const paginate = useCallback((newDirection) => {
        setDirection(newDirection);
        setCurrentPage((prevPage) => {
            const nextPage = prevPage + newDirection;
            if (nextPage < 0) return totalPages - 1;
            if (nextPage >= totalPages) return 0;
            return nextPage;
        });
    }, [totalPages]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDragEnd = useCallback((event, info) => {
        setIsDragging(false);
        if (info.offset.x < -100) paginate(1);
        else if (info.offset.x > 100) paginate(-1);
    }, [paginate]);

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
                <h2 className="text-2xl font-bold text-gray-800">Zone Population</h2>
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
        </div>
    );
};

export default ZonePopulationTable;