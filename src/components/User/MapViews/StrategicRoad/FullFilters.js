import React from "react";
import { motion } from "framer-motion";
import { FaBan } from "react-icons/fa";

const FullFilters = ({
    filterTitle,
    setFilterTitle,
    filterType,
    setFilterType,
    filterColor,
    setFilterColor,
}) => {
    return (
        <div className="p-4 border-b hidden sm:block">
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
                    <input
                        type="text"
                        placeholder="Enter road title"
                        value={filterTitle}
                        onChange={(e) => setFilterTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <div className="flex-1 min-w-[150px]">
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
                <div className="flex-1 min-w-[150px]">
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
                <div className="flex-1 flex items-end min-w-[150px]">
                    <motion.button
                        onClick={() => {
                            setFilterTitle("");
                            setFilterType("");
                            setFilterColor("");
                        }}
                        className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaBan />
                        Clear Filters
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default FullFilters;