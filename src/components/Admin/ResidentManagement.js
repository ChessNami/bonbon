import React from 'react';

const ResidentManagement = () => {
    const residents = [
        {
            id: 1,
            name: 'John Doe',
            gender: 'Male',
            dob: '1990-01-01',
            address: '123 Main St',
            purok: 'Zone 1',
        },
        {
            id: 2,
            name: 'Jane Smith',
            gender: 'Female',
            dob: '1995-05-15',
            address: '456 Elm St',
            purok: 'Zone 2',
        },
        // Add more residents as needed
    ];

    const handleView = (id) => {
        console.log(`View resident with ID: ${id}`);
    };

    const handleEdit = (id) => {
        console.log(`Edit resident with ID: ${id}`);
    };

    const handleDelete = (id) => {
        console.log(`Delete resident with ID: ${id}`);
    };

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Resident Management</h1>
            <div className="overflow-x-auto">
                <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-300 px-4 py-2">Name</th>
                            <th className="border border-gray-300 px-4 py-2">Gender</th>
                            <th className="border border-gray-300 px-4 py-2">Date of Birth</th>
                            <th className="border border-gray-300 px-4 py-2">Address</th>
                            <th className="border border-gray-300 px-4 py-2">Purok/Zone</th>
                            <th className="border border-gray-300 px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {residents.map((resident) => (
                            <tr key={resident.id} className="hover:bg-gray-100">
                                <td className="border border-gray-300 px-4 py-2">{resident.name}</td>
                                <td className="border border-gray-300 px-4 py-2">{resident.gender}</td>
                                <td className="border border-gray-300 px-4 py-2">{resident.dob}</td>
                                <td className="border border-gray-300 px-4 py-2">{resident.address}</td>
                                <td className="border border-gray-300 px-4 py-2">{resident.purok}</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <button
                                        onClick={() => handleView(resident.id)}
                                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-2"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleEdit(resident.id)}
                                        className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(resident.id)}
                                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                    >
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

export default ResidentManagement;