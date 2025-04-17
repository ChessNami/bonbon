import React, { useState, useRef, useEffect } from 'react';
import { FaUsers, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const ResidentManagement = () => {
    const residents = [
        {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            gender: 'Male',
            dob: '1990-01-01',
            address: '123 Main Street, Barangay Central, Quezon City, Metro Manila, Philippines',
            purok: 'Zone 1',
        },
        {
            id: 2,
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 'Female',
            dob: '1995-05-15',
            address: '456 Elm Street, Purok 5, Barangay West, Davao City',
            purok: 'Zone 2',
        },
    ];

    const [pendingCount] = useState(3);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedResident, setSelectedResident] = useState(null);
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        dob: '',
        address: '',
        purok: '',
    });

    const viewModalRef = useRef(null);
    const editModalRef = useRef(null);

    // Disable scroll on body when modal is open
    useEffect(() => {
        if (viewModalOpen || editModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [viewModalOpen, editModalOpen]);

    // Handle clicks outside modal to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (viewModalOpen && viewModalRef.current && !viewModalRef.current.contains(event.target)) {
                setViewModalOpen(false);
                setSelectedResident(null);
            }
            if (editModalOpen && editModalRef.current && !editModalRef.current.contains(event.target)) {
                setEditModalOpen(false);
                setSelectedResident(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [viewModalOpen, editModalOpen]);

    const handleView = (resident) => {
        setSelectedResident(resident);
        setViewModalOpen(true);
    };

    const handleEdit = (resident) => {
        setSelectedResident(resident);
        setEditForm({
            firstName: resident.firstName,
            lastName: resident.lastName,
            gender: resident.gender,
            dob: resident.dob,
            address: resident.address,
            purok: resident.purok,
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        console.log('Updated resident:', { id: selectedResident.id, ...editForm });
        setEditModalOpen(false);
        setSelectedResident(null);
    };

    const handleDelete = (id) => {
        console.log(`Delete resident with ID: ${id}`);
    };

    const handlePending = () => {
        console.log('View pending residents');
    };

    // Framer Motion variants for modal animation
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

    return (
        <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-[#dee5f8] p-4 flex items-center gap-2">
                <FaUsers className="text-[#172554]" size={24} />
                Resident Management
            </h1>
            <div className="min-h-screen p-2 sm:p-4">
                <div className="flex justify-start items-center mb-4 sm:mb-6">
                    <motion.button
                        onClick={handlePending}
                        className="relative bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Pending
                        {pendingCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </motion.button>
                </div>
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">First Name</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Last Name</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden sm:table-cell">Gender</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden md:table-cell">Date of Birth</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden lg:table-cell">Address</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden xl:table-cell">Purok/Zone</th>
                                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {residents.map((resident) => (
                                    <tr key={resident.id} className="hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm">
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.firstName}</td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.lastName}</td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden sm:table-cell">{resident.gender}</td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden md:table-cell">{resident.dob}</td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden lg:table-cell">
                                            <div className="relative group w-full">
                                                <span className="block truncate max-w-[100px] sm:max-w-[200px]">
                                                    {resident.address}
                                                </span>

                                                <span className="absolute bottom-full left-0 mb-2 z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded-md px-2 py-1 whitespace-normal max-w-[200px] sm:max-w-[300px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {resident.address}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden xl:table-cell">{resident.purok}</td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 border-b">
                                            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                                <motion.button
                                                    onClick={() => handleView(resident)}
                                                    className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs sm:text-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    View
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleEdit(resident)}
                                                    className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600 transition-colors duration-200 text-xs sm:text-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    Edit
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleDelete(resident.id)}
                                                    className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-600/90 transition-colors duration-200 text-xs sm:text-sm"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    Delete
                                                </motion.button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* View Modal */}
                <AnimatePresence>
                    {viewModalOpen && selectedResident && (
                        <>
                            <motion.div
                                className="fixed inset-0 bg-black z-40"
                                variants={backdropVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            />
                            <motion.div
                                className="fixed inset-0 flex items-center justify-center z-50 p-4"
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <div
                                    ref={viewModalRef}
                                    className="bg-white rounded-lg w-full max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
                                >
                                    <div className="flex justify-between items-center p-4 border-b">
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Resident Details</h2>
                                        <motion.button
                                            onClick={() => {
                                                setViewModalOpen(false);
                                                setSelectedResident(null);
                                            }}
                                            className="text-gray-600 hover:text-gray-900"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            aria-label="Close modal"
                                        >
                                            <FaTimes size={20} />
                                        </motion.button>
                                    </div>
                                    <div className="p-4 overflow-y-auto">
                                        <div className="space-y-3 text-sm sm:text-base">
                                            <p><strong>First Name:</strong> {selectedResident.firstName}</p>
                                            <p><strong>Last Name:</strong> {selectedResident.lastName}</p>
                                            <p><strong>Gender:</strong> {selectedResident.gender}</p>
                                            <p><strong>Date of Birth:</strong> {selectedResident.dob}</p>
                                            <p><strong>Address:</strong> {selectedResident.address}</p>
                                            <p><strong>Purok/Zone:</strong> {selectedResident.purok}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Edit Modal */}
                <AnimatePresence>
                    {editModalOpen && selectedResident && (
                        <>
                            <motion.div
                                className="fixed inset-0 bg-black z-40"
                                variants={backdropVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            />
                            <motion.div
                                className="fixed inset-0 flex items-center justify-center z-50 p-4"
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <div
                                    ref={editModalRef}
                                    className="bg-white rounded-lg w-full max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
                                >
                                    <div className="flex justify-between items-center p-4 border-b">
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Resident</h2>
                                        <motion.button
                                            onClick={() => {
                                                setEditModalOpen(false);
                                                setSelectedResident(null);
                                            }}
                                            className="text-gray-600 hover:text-gray-900"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            aria-label="Close modal"
                                        >
                                            <FaTimes size={20} />
                                        </motion.button>
                                    </div>
                                    <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col">
                                        <div className="p-4 overflow-y-auto">
                                            <div className="space-y-4 text-sm sm:text-base">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.firstName}
                                                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.lastName}
                                                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                                                    <select
                                                        value={editForm.gender}
                                                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    >
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.dob}
                                                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.address}
                                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Purok/Zone</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.purok}
                                                        onChange={(e) => setEditForm({ ...editForm, purok: e.target.value })}
                                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t flex justify-end space-x-3">
                                            <motion.button
                                                type="button"
                                                onClick={() => {
                                                    setEditModalOpen(false);
                                                    setSelectedResident(null);
                                                }}
                                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm sm:text-base"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Cancel
                                            </motion.button>
                                            <motion.button
                                                type="submit"
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Save
                                            </motion.button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ResidentManagement;