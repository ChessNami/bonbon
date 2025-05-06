import React from 'react';
import { FaVenusMars, FaCalendarAlt, FaMapMarkerAlt, FaEye, FaSyncAlt, FaTrashAlt, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';

const ResidentCard = ({ resident, onView, onUpdate, onDelete, getStatusBadge }) => {
    const statusColors = {
        1: { gradient: 'linear-gradient(to bottom, #10B981, #34D399)', pulse: 'bg-green-400' },
        2: { gradient: 'linear-gradient(to bottom, #EF4444, #F87171)', pulse: 'bg-red-400' },
        3: { gradient: 'linear-gradient(to bottom, #F59E0B, #FBBF24)', pulse: 'bg-yellow-400' },
        4: { gradient: 'linear-gradient(to bottom, #3B82F6, #60A5FA)', pulse: 'bg-blue-400' },
        5: { gradient: 'linear-gradient(to bottom, #8B5CF6, #A78BFA)', pulse: 'bg-purple-400' },
        6: { gradient: 'linear-gradient(to bottom, #F97316, #FBBF24)', pulse: 'bg-orange-400' },
    };

    const { gradient, pulse } = statusColors[resident.status] || {
        gradient: 'linear-gradient(to bottom, #6B7280, #9CA3AF)',
        pulse: 'bg-gray-400',
    };

    const getTimestampLabel = () => {
        switch (resident.status) {
            case 1:
                return resident.updatedAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Approved At:</span> {new Date(resident.updatedAt).toLocaleString()}</span>
                    </p>
                ) : null;
            case 2:
                return resident.updatedAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Rejected At:</span> {new Date(resident.updatedAt).toLocaleString()}</span>
                    </p>
                ) : null;
            case 3:
                return resident.createdAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Submitted At:</span> {new Date(resident.createdAt).toLocaleString()}</span>
                    </p>
                ) : null;
            case 4:
                return resident.createdAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Requested At:</span> {new Date(resident.createdAt).toLocaleString()}</span>
                    </p>
                ) : null;
            case 5:
                return resident.updatedAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Update Approved At:</span> {new Date(resident.updatedAt).toLocaleString()}</span>
                    </p>
                ) : null;
            case 6:
                return resident.updatedAt ? (
                    <p className="flex items-center gap-3">
                        <FaClock className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Update Profiling At:</span> {new Date(resident.updatedAt).toLocaleString()}</span>
                    </p>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <motion.div
            className="relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div
                className="absolute top-0 left-0 w-2 h-full"
                style={{ background: gradient }}
            />
            <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-4">
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl shadow-md">
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
                                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full ${resident.profileImageUrl ? 'hidden' : ''}`}
                            >
                                {resident.firstName.charAt(0).toUpperCase()}{resident.lastName.charAt(0).toUpperCase()}
                            </div>
                            <div
                                className={`absolute -top-1 -right-1 w-4 h-4 ${pulse} rounded-full border-2 border-white animate-pulse`}
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-wide">
                                {resident.firstName.charAt(0).toUpperCase() + resident.firstName.slice(1)} {resident.lastName.charAt(0).toUpperCase() + resident.lastName.slice(1)}
                            </h3>
                            <div className="mt-1">{getStatusBadge(resident.status)}</div>
                        </div>
                    </div>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="flex items-center gap-3">
                        <FaVenusMars className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Gender:</span> {resident.gender}</span>
                    </p>
                    <p className="flex items-center gap-3">
                        <FaCalendarAlt className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Date of Birth:</span> {resident.dob}</span>
                    </p>
                    <p className="flex items-center gap-3 truncate">
                        <FaMapMarkerAlt className="text-emerald-500" />
                        <span className="font-medium"><span className="font-bold">Address:</span> {resident.address}</span>
                    </p>
                    {resident.status === 6 && resident.rejectionReason && (
                        <p className="flex items-center gap-3 text-orange-600">
                            <FaExclamationTriangle className="text-orange-500" />
                            <span className="font-medium"><span className="font-bold">Reason:</span> {resident.rejectionReason}</span>
                        </p>
                    )}
                    {getTimestampLabel()}
                </div>
                <div className="flex flex-wrap gap-3 mt-6">
                    <motion.button
                        onClick={onView}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaEye />
                        View
                    </motion.button>
                    <motion.button
                        onClick={onUpdate}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-full hover:bg-amber-600 transition-colors duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaSyncAlt />
                        Update
                    </motion.button>
                    <motion.button
                        onClick={onDelete}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-500 rounded-full hover:bg-rose-600 transition-colors duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaTrashAlt />
                        Delete
                    </motion.button>
                </div>
            </div>
            <motion.div
                className="absolute inset-0 bg-emerald-50 opacity-0 transition-opacity duration-500 pointer-events-none"
                whileHover={{ opacity: 0.15 }}
            />
        </motion.div>
    );
};

export default ResidentCard;