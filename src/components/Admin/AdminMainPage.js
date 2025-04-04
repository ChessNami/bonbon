import React from "react";
import AdminHome from "./AdminHome";
import BarangayOfficials from "./BarangayOfficials";
import ResidentManagement from "./ResidentManagement";
import AdminMainProfileComponent from "./AdminMainProfileComponent";

const AdminMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Barangay Officials":
                return <BarangayOfficials />;
            case "Resident Management":
                return <ResidentManagement />;
            case "Profile": // New case for Profile
                return <AdminMainProfileComponent />;
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