import React from "react";
import AdminHome from "./AdminHome";
import BarangayOfficials from "./BarangayOfficials";
import SKOfficials from "./SKOfficials";
import ResidentManagement from "./ResidentManagement";
import AdminMainProfileComponent from "./AdminMainProfileComponent";
import AdminProMgmt from "./AdminProMgmt";
import Settings from "./Settings";
import AdminStrategicRoadmap from "./AdminStrategicRoadmap";
import Geotagging from "./Geotagging";
import UserFeedback from "./UserFeedback";

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
            case "Geotagging":
                return <Geotagging />;
            case "Strategic Road Map":
                return <AdminStrategicRoadmap />;
            case "Project Management":
                return <AdminProMgmt />;
            case "User Feedback":
                return <UserFeedback />;
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