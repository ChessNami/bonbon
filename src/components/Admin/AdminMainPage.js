import React from "react";
import AdminHome from "./AdminHome";
import BarangayOfficials from "./BarangayOfficials";
import SKOfficials from "./SKOfficials";
import ResidentManagement from "./ResidentManagement";
import AdminMainProfileComponent from "./AdminMainProfileComponent";
import AdminSMP from "./AdminSMP";
import AdminProMgmt from "./AdminProMgmt";
import Settings from "./Settings";

const AdminMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Barangay Officials":
                return <BarangayOfficials />;
            case "SK Officials":
                return <SKOfficials />;
            case "Resident Management":
                return <ResidentManagement />;
            case "Strategic Road Map":
                return <AdminSMP />;
            case "Project Management":
                return <AdminProMgmt />;
            case "Profile":
                return <AdminMainProfileComponent />;
            case "Settings":
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