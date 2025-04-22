import React from "react";
import AdminHome from "./AdminHome";
import ResidentManagement from "./ResidentManagement";
import AdminMainProfileComponent from "./AdminMainProfileComponent";
import Settings from "./Settings";
import UserFeedback from "./UserFeedback";
import TransparencyMainComponent from "./TransparencyMainComponent";
import PlanningMainComponent from "./PlanningMainComponent";

const AdminMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Resident Management":
                return <ResidentManagement />;
            case "Planning":
                return <PlanningMainComponent />;
            case "Transparency":
                return <TransparencyMainComponent />;
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