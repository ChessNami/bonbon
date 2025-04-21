import React from "react";
import { FaHome, FaUsers, FaCog, FaUserTie, FaUserFriends, FaClipboardList, FaMap, FaMapMarkerAlt, FaComment, FaFileAlt } from "react-icons/fa";

const AdminTitles = ({ currentPage }) => {
    const titles = {
        Home: { title: "Home", icon: FaHome },
        "Barangay Officials": { title: "Barangay Officials", icon: FaUserTie },
        "SK Officials": { title: "SK Officials", icon: FaUserFriends },
        Geotagging: { title: "Geotagging", icon: FaMapMarkerAlt },
        "Resident Management": { title: "Resident Management", icon: FaUsers },
        "Strategic Road Map": { title: "Strategic Road Map", icon: FaMap },
        "Project Management": { title: "Project Management", icon: FaClipboardList },
        "Transparency": { title: "Transparency", icon: FaFileAlt },
        "User Feedback": { title: "User Feedback", icon: FaComment },
        Settings: { title: "Settings", icon: FaCog },
        Profile: { title: "Profile", icon: FaUsers }, // Assuming FaUsers for Profile; adjust if needed
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