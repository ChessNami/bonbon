import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaFilter } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const FilterSearch = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, sortOption, setSortOption, itemsPerPage, setItemsPerPage, onClearFilters, isRentingFilter, setIsRentingFilter }) => {
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 relative">
            <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Search by name, address, or zone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder-gray-400 transition-all duration-200"
                />
            </div>
            <div className="relative">
                <motion.button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FaFilter className="text-emerald-600" size={16} />
                    Filter & Sort
                </motion.button>
                <AnimatePresence>
                    {showFilterDropdown && (
                        <motion.div
                            ref={filterDropdownRef}
                            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="p-4">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">Filter by Status</h3>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="1">Approved</option>
                                    <option value="2">Rejected</option>
                                    <option value="3">Pending</option>
                                    <option value="4">Update Requested</option>
                                    <option value="5">Update Approved</option>
                                </select>
                            </div>
                            <div className="p-4 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">Filter by Renting Status</h3>
                                <select
                                    value={isRentingFilter}
                                    onChange={(e) => setIsRentingFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                >
                                    <option value="all">All Renting Statuses</option>
                                    <option value="Yes">Renting</option>
                                    <option value="No">Not Renting</option>
                                </select>
                            </div>
                            <div className="p-4 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">Sort By</h3>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                >
                                    <option value="default">Default (Pending First, Approved by Name)</option>
                                    <option value="name-asc">Name (A-Z)</option>
                                    <option value="name-desc">Name (Z-A)</option>
                                    <option value="status-asc">Status (Ascending)</option>
                                    <option value="status-desc">Status (Descending)</option>
                                    <option value="date-asc">Date Added (Oldest)</option>
                                    <option value="date-desc">Date Added (Newest)</option>
                                </select>
                            </div>
                            <div className="p-4 border-t border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">Items Per Page</h3>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                >
                                    <option value={5}>5 per page</option>
                                    <option value={10}>10 per page</option>
                                    <option value={20}>20 per page</option>
                                    <option value={50}>50 per page</option>
                                </select>
                            </div>
                            <div className="p-4 border-t border-gray-100">
                                <motion.button
                                    onClick={onClearFilters}
                                    className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Clear Filters
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FilterSearch;