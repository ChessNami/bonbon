import React, { useState, useEffect } from "react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import AdminMainPage from "./AdminMainPage";
import Footer from "../Footer"; // Adjust path if needed

const AdminMainComponent = ({ onLogout }) => {
    const [currentPage, setCurrentPage] = useState("Home");
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentPage]);

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
            />

            {/* Main Content */}
            <div className="flex flex-col flex-grow">
                {/* Header - Fixed */}
                <AdminHeader onLogout={onLogout} setCurrentPage={setCurrentPage} />

                {/* Scrollable Main Content and Footer Container */}
                <div className="flex-1 flex flex-col">
                    {/* Scrollable Main Content */}
                    <main
                        id="main-content"
                        className="flex-grow overflow-y-auto"
                    >
                        <AdminMainPage currentPage={currentPage} />
                    </main>

                    {/* Footer - Always at Bottom */}
                    <Footer className="mt-auto" />
                </div>
            </div>
        </div>
    );
};

export default AdminMainComponent;