import React from "react";
import AdminHome from "./AdminHome";
import BarangayOfficials from "./BarangayOfficials";
import ResidentManagement from "./ResidentManagement"; // Import ResidentManagement

const MainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Barangay Officials":
                return <BarangayOfficials />;
            case "Resident Management": // Add case for Resident Management
                return <ResidentManagement />;
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

export default MainPage;