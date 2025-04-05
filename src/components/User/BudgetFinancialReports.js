import React, { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

const BudgetFinancialReports = () => {
    const [search, setSearch] = useState("");
    const users = [
        { id: 1, name: "John Doe", role: "Admin", status: "Active" },
        { id: 2, name: "Jane Smith", role: "User", status: "Inactive" },
        { id: 3, name: "Alice Johnson", role: "Moderator", status: "Active" },
        { id: 4, name: "Bob Brown", role: "User", status: "Active" },
    ];

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg h-full flex flex-col">
            {/* Title and Search Bar */}
            <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">User Management</h2>
                <input
                    type="text"
                    placeholder="Search..."
                    className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Scrollable User Table */}
            <div className="overflow-y-auto flex-grow">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-200 text-left">
                            <th className="p-3">Name</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-100">
                                    <td className="p-3">{user.name}</td>
                                    <td className="p-3">{user.role}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-white ${user.status === "Active" ? "bg-green-500" : "bg-red-500"}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button className="text-blue-500 hover:text-blue-700 p-2">
                                            <FaEdit />
                                        </button>
                                        <button className="text-red-500 hover:text-red-700 p-2 ml-2">
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center p-3 text-gray-500">No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BudgetFinancialReports;