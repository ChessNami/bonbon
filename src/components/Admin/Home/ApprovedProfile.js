import React, { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";

const ApprovedProfile = () => {
    const [approvedCount, setApprovedCount] = useState(0);

    useEffect(() => {
        setApprovedCount(Math.floor(Math.random() * (5000 - 500 + 1)) + 500);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-green-500 text-white p-3 rounded-full">
                <FaCheckCircle size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Approved Profiles</h2>
                <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
        </div>
    );
};

export default ApprovedProfile;
