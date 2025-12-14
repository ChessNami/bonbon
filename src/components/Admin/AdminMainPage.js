import React from "react";
import AdminHome from "./Home/AdminHome";
import ResidentManagement from "./ResidentManagement/ResidentManagement";
import AdminMainProfileComponent from "./Profile/AdminMainProfileComponent";
import Settings from "./Settings/Settings";
import UserFeedback from "./UserFeedback/UserFeedback";
import TransparencyMainComponent from "./Transparency/TransparencyMainComponent";
import PlanningMainComponent from "./Planning/PlanningMainComponent";
import RoleManagement from "./RoleManagement";
import Demographics from "./Demographics/Demographics";

const AdminMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <AdminHome />;
            case "Demographics":
                return <Demographics />;
            case "Resident Management":
                return <ResidentManagement />;
            case "Geolocation & Projects":
                return <PlanningMainComponent />;
            case "Transparency":
                return <TransparencyMainComponent />;
            case "User Feedback":
                return <UserFeedback />;
            case "Profile":
                return <AdminMainProfileComponent />;
            case "Settings":
                return <Settings />;
            case "Role Management":
                return <RoleManagement />;
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