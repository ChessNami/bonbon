import React from "react";

const AdminMainComponent = ({ onLogout }) => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Admin Dashboard</h1>
            <p className="text-lg text-gray-700 mb-4">
                Welcome to the Admin Dashboard. Here you can manage users, view reports, and configure settings.
            </p>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">User Management</h2>
                <p className="text-lg text-gray-700 mb-4">
                    Manage user accounts, roles, and permissions.
                </p>
            </section>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Reports</h2>
                <p className="text-lg text-gray-700 mb-4">
                    View and generate reports on system usage and performance.
                </p>
            </section>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Settings</h2>
                <p className="text-lg text-gray-700 mb-4">
                    Configure system settings and preferences.
                </p>
            </section>
            <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>
    );
};

export default AdminMainComponent;