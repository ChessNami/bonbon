import React from "react";

const BarangayOfficials = () => {
    // Sample data for demonstration
    const officials = [
        {
            id: 1,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "John Doe",
            position: "Chairman",
            officialType: "Elected",
        },
        {
            id: 2,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "Jane Smith",
            position: "Secretary",
            officialType: "Appointed",
        },
        {
            id: 3,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "Mark Johnson",
            position: "Treasurer",
            officialType: "Elected",
        },
    ];

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h1 className="text-xl font-bold mb-4">Barangay Officials</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Position</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Official Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {officials.map((official) => (
                            <tr key={official.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">
                                    <div className="flex items-center">
                                        <img
                                            src={official.image}
                                            alt={official.name}
                                            className="w-24 h-24 rounded object-cover mr-4"
                                        />
                                        <span>{official.name}</span>
                                    </div>
                                </td>
                                <td className="border border-gray-300 px-4 py-2">{official.position}</td>
                                <td className="border border-gray-300 px-4 py-2">{official.officialType}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                                        Edit
                                    </button>
                                    <button className="px-2 py-1 bg-red-500 text-white rounded ml-2 hover:bg-red-600">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BarangayOfficials;