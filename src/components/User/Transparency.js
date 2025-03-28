import React from "react";

const Transparency = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Transparency Page</h1>
            <p className="text-lg text-gray-700 mb-4">
                Welcome to the Transparency page of Barangay Bonbon.
            </p>
            <div className="flex justify-center space-x-4 mt-6">
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Barangay Council</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Sanguniang Kabataan (SK)</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Bids and Projects</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Budget and Financial Accountability Reports</button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Status of Implementation, Evaluation or Assessment Reports</button>
            </div>
        </div>
    );
};


export default Transparency;
