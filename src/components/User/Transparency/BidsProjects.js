// BidsProjects.js
import React from "react";

const BidsProjects = () => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Bids and Projects</h2>
            <p className="text-gray-700">
                This section lists ongoing and completed projects, including bidding processes and project details
                for transparency in Barangay Bonbon.
            </p>
            <ul className="list-disc pl-6 mt-2">
                <li>Road Repair Project - Completed: June 2023</li>
                <li>Community Center Renovation - In Progress</li>
            </ul>
        </div>
    );
};

export default BidsProjects;