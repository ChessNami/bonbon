import React, { useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const RejectedModal = ({ isOpen, residents, onClose, zIndex, getStatusBadge }) => {
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
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Rejected Residents</h2>
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
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {resident.firstName} {resident.lastName}
                                                    </h3>
                                                    <div>{getStatusBadge(resident.status)}</div>
                                                </div>
                                                {resident.rejectionReason && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        <span className="font-medium">Reason:</span> {resident.rejectionReason}
                                                    </p>
                                                )}
                                                {resident.updatedAt && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        <span className="font-medium">Rejected At:</span>{' '}
                                                        {new Date(resident.updatedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center italic">No rejected residents at this time.</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
};

export default RejectedModal;