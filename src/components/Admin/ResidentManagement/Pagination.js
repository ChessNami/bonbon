import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Pagination = ({ currentPage, totalPages, indexOfFirstItem, indexOfLastItem, totalItems, onPaginate }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} residents
            </div>
            <div className="flex items-center gap-2">
                <motion.button
                    onClick={() => onPaginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                >
                    <FaChevronLeft />
                </motion.button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <motion.button
                        key={page}
                        onClick={() => onPaginate(page)}
                        className={`px-4 py-2 rounded-md text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {page}
                    </motion.button>
                ))}
                <motion.button
                    onClick={() => onPaginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                    whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
                >
                    <FaChevronRight />
                </motion.button>
            </div>
        </div>
    );
};

export default Pagination;