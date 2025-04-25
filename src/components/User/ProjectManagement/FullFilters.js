import React from "react";
import { motion } from "framer-motion";
import { FaBan } from "react-icons/fa";

const FullFilters = ({
    filterTitle,
    setFilterTitle,
    filterStatus,
    setFilterStatus,
    filterColor,
    setFilterColor,
    filterCompletionMin,
    setFilterCompletionMin,
    filterCompletionMax,
    setFilterCompletionMax,
    filterDateStart,
    setFilterDateStart,
    filterDateEnd,
    setFilterDateEnd,
}) => {
    return (
        <div className="p-4 border-b hidden sm:block">
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
                    <input
                        type="text"
                        placeholder="Enter project title"
                        value={filterTitle}
                        onChange={(e) => setFilterTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Cancelled">Cancelled</option>
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
                        <option value="Satisfactory">Satisfactory</option>
                        <option value="With Minor Deficiencies">With Minor Deficiencies</option>
                        <option value="With Serious Deficiencies">With Serious Deficiencies</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Completion Rate (%)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filterCompletionMin}
                            onChange={(e) => setFilterCompletionMin(e.target.value)}
                            min="0"
                            max="100"
                            className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            value={filterCompletionMax}
                            onChange={(e) => setFilterCompletionMax(e.target.value)}
                            min="0"
                            max="100"
                            className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Date Range</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                            className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <input
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                            className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="flex-1 flex items-end min-w-[150px]">
                    <motion.button
                        onClick={() => {
                            setFilterTitle("");
                            setFilterStatus("");
                            setFilterColor("");
                            setFilterCompletionMin("");
                            setFilterCompletionMax("");
                            setFilterDateStart("");
                            setFilterDateEnd("");
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