import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const UpdateModal = ({ isOpen, rejectionReason, setRejectionReason, onSubmit, onClose, zIndex }) => {
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

    const quickReasons = [
        { en: 'Incomplete household composition', ceb: 'Dili kompleto ang komposisyon sa panimalay' },
        { en: 'Incorrect personal information', ceb: 'Sayop nga personal nga impormasyon' },
        { en: 'Missing or incomplete census data', ceb: 'Nawala o dili kompleto ang datos sa sensus' },
        { en: 'Outdated contact details', ceb: 'Karaang detalye sa kontak' },
        { en: 'Invalid or missing ID information', ceb: 'Dili balido o nawala ang impormasyon sa ID' },
        { en: 'Inconsistent household member counts', ceb: 'Dili magkatakdo ang ihap sa miyembro sa panimalay' },
        { en: 'Missing or outdated spouse details', ceb: 'Nawala o karaan ang detalye sa bana/asawa' },
        { en: 'Incorrect or outdated employment/education details', ceb: 'Sayop o karaan ang detalye sa trabaho/edukasyon' },
    ];

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
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Request Profile Update</h2>
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
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Select Reasons</h3>
                            <div className="flex flex-wrap gap-2">
                                {quickReasons.map((reason, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => setRejectionReason(reason.en)}
                                        title={reason.ceb} // Bisaya/Cebuano translation as tooltip
                                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors duration-200"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {reason.en}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Reason for Update Request</h3>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for update request..."
                                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
                                rows={5}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <motion.button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={onSubmit}
                                className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-full hover:bg-amber-600 transition-colors duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Submit Request
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
};

export default UpdateModal;