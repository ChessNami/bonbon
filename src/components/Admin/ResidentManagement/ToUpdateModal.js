import React, { useRef } from 'react';
import { FaTimes, FaEye } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const ToUpdateModal = ({
    isOpen,
    residents,
    onView,
    onClose,
    zIndex,
    getStatusBadge,
}) => {
    const modalRef = useRef(null);

    const modalVariants = {
        hidden: { opacity: 0, y: -50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 0.5, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <>
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-60"
                    style={{ zIndex: zIndex - 10 }}
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                />
                <motion.div
                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                    style={{ zIndex }}
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <div
                        ref={modalRef}
                        className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] h-full flex flex-col overflow-hidden shadow-2xl"
                    >
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Update Profiling Residents</h2>
                            <motion.button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-800 transition-colors duration-200"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Close modal"
                            >
                                <FaTimes size={24} />
                            </motion.button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {residents.length > 0 ? (
                                residents.map((resident) => (
                                    <div
                                        key={resident.id}
                                        className="bg-gray-50 p-5 rounded-xl mb-4 border border-gray-200 hover:shadow-md transition-shadow duration-200"
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                                                    {resident.profileImageUrl ? (
                                                        <img
                                                            src={resident.profileImageUrl}
                                                            alt={`${resident.firstName} ${resident.lastName}`}
                                                            className="w-full h-full rounded-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 ${resident.profileImageUrl ? 'hidden' : ''}`}
                                                    >
                                                        {resident.firstName.charAt(0).toUpperCase()}
                                                        {resident.lastName.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {resident.firstName} {resident.lastName}
                                                    </h3>
                                                    <div className="mt-1">{getStatusBadge(resident.status)}</div>
                                                    {resident.updatedAt && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            <span className="font-medium">Update Requested At:</span>{' '}
                                                            {new Date(resident.updatedAt).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                <motion.button
                                                    onClick={() => onView(resident)}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors duration-300"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaEye />
                                                    View
                                                </motion.button>
                                            </div>
                                        </div>
                                        {resident.rejectionReason && (
                                            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Reason for Update Request</h4>
                                                <p className="text-sm text-gray-600 italic">{resident.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center italic">No residents requiring profile updates at this time.</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
};

export default ToUpdateModal;