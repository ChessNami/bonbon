// src\components\Admin\AdminMainPage.js
import React from "react";
import AdminHome from "./AdminHome";
import BarangayOfficials from "./BarangayOfficials";
import ResidentManagement from "./ResidentManagement";
import AdminMainProfileComponent from "./AdminMainProfileComponent";
import AdminSMP from "./AdminSMP";
import Settings from "./Settings"; // Import the new Settings component
import AdminProMgmt from "./AdminProMgmt";

const AdminMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Barangay Officials":
                return <BarangayOfficials />;
            case "Resident Management":
                return <ResidentManagement />;
            case "Strategic Road Map":
                return <AdminSMP />;
            case "Project Management":
                return <AdminProMgmt />;     
            case "Profile":
                return <AdminMainProfileComponent />;
            case "Settings": // New case for Settings
                return <Settings />;
            default:
                return <AdminHome />;
        }
    };

    return (
        <div>
            {renderPage()}
        </div>
    );
};

export default AdminMainPage;