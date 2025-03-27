import React, { useState, useEffect } from "react";
import { FaHourglassHalf } from "react-icons/fa";

const PendingProfile = () => {
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        setPendingCount(Math.floor(Math.random() * (100 - 10 + 1)) + 10);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-yellow-500 text-white p-3 rounded-full">
                <FaHourglassHalf size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Pending Profiles</h2>
                <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
        </div>
    );
};

export default PendingProfile;
