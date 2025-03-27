import React, { useState, useEffect } from "react";
import { FaUsers } from "react-icons/fa";

const TotalResident = () => {
    const [totalResidents, setTotalResidents] = useState(0);

    useEffect(() => {
        // Generate a random resident count between 500 and 5000
        const randomResidents = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
        setTotalResidents(randomResidents);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-blue-500 text-white p-3 rounded-full">
                <FaUsers size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Total Residents</h2>
                <p className="text-2xl font-bold">{totalResidents}</p>
            </div>
        </div>
    );
};

export default TotalResident;
