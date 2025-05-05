import React from 'react';

export const capitalizeWords = (str) => {
    if (!str) return 'N/A';
    return str
        .split(/(?=[A-Z])|_/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const getStatusBadge = (status) => {
    const statusMap = {
        1: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
        2: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
        3: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        4: { label: 'Update Requested', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        5: { label: 'Update Approved', color: 'bg-purple-100 text-purple-800 border-purple-200' },
        6: { label: 'Update Profiling', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    };

    const { label, color } = statusMap[status] || {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
        >
            {label}
        </span>
    );
};