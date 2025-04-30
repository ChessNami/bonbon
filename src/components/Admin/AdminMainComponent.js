import React, { useState, useEffect } from "react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import AdminMainPage from "./AdminMainPage";
import AdminTitles from "./AdminTitles";
import Footer from "../Footer";

const AdminMainComponent = ({ onLogout }) => {
    const [currentPage, setCurrentPage] = useState("Home");
    const [pendingPage, setPendingPage] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [currentPage]);

    const handleSetCurrentPage = (page) => {
        // For ResidentManagement and Settings, introduce a pending state
        if (page === "ResidentManagement" || page === "Settings") {
            setPendingPage(page);
            // Simulate a short delay to allow sidebar to update
            setTimeout(() => {
                setCurrentPage(page);
                setPendingPage(null);
            }, 200); // 200ms delay to ensure sidebar UI updates first
        } else {
            setCurrentPage(page);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                currentPage={pendingPage || currentPage} // Show pendingPage in sidebar for immediate feedback
                setCurrentPage={handleSetCurrentPage}
            />

            {/* Main Content */}
            <div className="flex flex-col flex-grow">
                {/* Header - Fixed */}
                <AdminHeader onLogout={onLogout} setCurrentPage={handleSetCurrentPage} />

                {/* Title */}
                <AdminTitles currentPage={currentPage} />

                {/* Scrollable Main Content and Footer Container */}
                <div className="flex-1 flex flex-col">
                    {/* Scrollable Main Content */}
                    <main id="main-content" className="flex-grow overflow-y-auto">
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