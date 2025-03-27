import React, { useState, useEffect } from "react";
import { FaTimesCircle } from "react-icons/fa";

const RejectedProfile = () => {
    const [rejectedCount, setRejectedCount] = useState(0);

    useEffect(() => {
        setRejectedCount(Math.floor(Math.random() * (50 - 5 + 1)) + 5);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-red-500 text-white p-3 rounded-full">
                <FaTimesCircle size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Rejected Profiles</h2>
                <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
        </div>
    );
};

export default RejectedProfile;
