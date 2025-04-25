import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilter, FaBan } from "react-icons/fa";

const PhoneFilters = ({
    filterTitle,
    setFilterTitle,
    filterType,
    setFilterType,
    filterColor,
    setFilterColor,
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const buttonRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                filterRef.current &&
                !filterRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Framer Motion variants for dropdown animation
    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.2, ease: "easeOut" },
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: { duration: 0.15, ease: "easeIn" },
        },
    };

    return (
        <div className="relative sm:hidden p-4 border-b">
            <motion.button
                ref={buttonRef}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all duration-200 text-sm shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FaFilter className="w-5 h-5" />
                {isFilterOpen ? "Hide Filters" : "Show Filters"}
            </motion.button>
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div
                        ref={filterRef}
                        className="absolute left-4 mt-2 p-4 w-72 bg-white rounded-lg shadow-lg z-20"
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
                                <input
                                    type="text"
                                    placeholder="Enter road title"
                                    value={filterTitle}
                                    onChange={(e) => setFilterTitle(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Road Type</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">All Types</option>
                                    <option value="Concrete">Concrete</option>
                                    <option value="Improvement">Improvement</option>
                                    <option value="Widening">Widening</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <select
                                    value={filterColor}
                                    onChange={(e) => setFilterColor(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">All Colors</option>
                                    <option value="gray">Gray</option>
                                    <option value="yellow">Yellow</option>
                                    <option value="blue">Blue</option>
                                </select>
                            </div>
                            <motion.button
                                onClick={() => {
                                    setFilterTitle("");
                                    setFilterType("");
                                    setFilterColor("");
                                }}
                                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm w-full"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaBan />
                                Clear Filters
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PhoneFilters;