import { FaCheck, FaSyncAlt, FaEdit } from 'react-icons/fa';
import { motion } from 'framer-motion';

const HeaderControls = ({
    pendingCount,
    rejectedCount,
    requestsCount,
    updateProfilingCount,
    onPending,
    onRejected,
    onRequests,
    onUpdateProfiling,
    onReload
}) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-6">
            <div className="flex flex-wrap items-center gap-4">
                <motion.button
                    onClick={onPending}
                    className="relative bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaCheck />
                    Pending
                    {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                </motion.button>

                <motion.button
                    onClick={onRequests}
                    className="relative bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaSyncAlt />
                    Requests
                    {requestsCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-pulse">
                            {requestsCount}
                        </span>
                    )}
                </motion.button>

                <motion.button
                    onClick={onUpdateProfiling}
                    className="relative bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-orange-700 transition-colors duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaEdit />
                    To Update
                    {updateProfilingCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-pulse">
                            {updateProfilingCount}
                        </span>
                    )}
                </motion.button>
            </div>

            <motion.button
                onClick={onReload}
                className="bg-gray-600 text-white p-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Reload Residents"
            >
                <FaSyncAlt size={18} />
            </motion.button>
        </div>
    );
};

export default HeaderControls;