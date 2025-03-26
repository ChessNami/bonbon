import React from "react";

const Help = () => {
    return (
        <div className="w-full">
            <h2 className="text-3xl font-extrabold text-gray-700 mb-4 border-b pb-2">Help</h2>
            <p className="text-gray-600 mb-4">This section provides guidance on how to use the Profile section.</p>
            <ul className="space-y-3">
                <li className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                    <strong className="text-gray-700">My Account:</strong>{" "}
                    <span className="text-gray-600">View your account information including display name, email, and date created.</span>
                </li>
                <li className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                    <strong className="text-gray-700">Account Settings:</strong>{" "}
                    <span className="text-gray-600">Change your email and password.</span>
                </li>
                <li className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                    <strong className="text-gray-700">Resident Profiling:</strong>{" "}
                    <span className="text-gray-600">Submit a profiling request.</span>
                </li>
            </ul>
        </div>
    );
};

export default Help;
