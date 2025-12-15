import React from "react";
import { FaHome, FaUsers, FaCog, FaComment, FaFileAlt, FaCode, FaChartBar, FaMapMarkedAlt } from "react-icons/fa";

const AdminTitles = ({ currentPage }) => {
    const titles = {
        Home: { title: "Home", icon: FaHome },
        "Demographics": { title: "Demographics", icon: FaChartBar },
        "Resident Management": { title: "Resident Management", icon: FaUsers },
        "Geolocation & Projects": { title: "Geolocation & Projects", icon: FaMapMarkedAlt },
        Transparency: { title: "Transparency", icon: FaFileAlt },
        "User Feedback": { title: "User Feedback", icon: FaComment },
        Settings: { title: "Settings", icon: FaCog },
        Profile: { title: "Profile", icon: FaUsers },
        "Role Management": { title: "Role Management", icon: FaCode },
    };

    const { title, icon: Icon } = titles[currentPage] || { title: "Home", icon: FaHome };

    return (
        <h1 className="text-2xl font-bold bg-[#dee5f8] p-4 flex items-center gap-2">
            <Icon className="text-[#172554]" size={30} />
            {title}
        </h1>
    );
};

export default AdminTitles;