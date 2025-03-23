import React, { useState } from "react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import AdminMainPage from "./AdminMainPage";
import Footer from "../Footer";

const AdminMainComponent = ({ onLogout }) => {
    const [currentPage, setCurrentPage] = useState("Home");
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar taking the entire left side */}
            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
            />

            {/* Main Content */}
            <div className="flex flex-col flex-grow">
                {/* Header - Fixed */}
                <AdminHeader onLogout={onLogout} />

                {/* Scrollable Main Content */}
                <main className="flex-grow overflow-y-auto h-96">
                    <AdminMainPage currentPage={currentPage} />
                    {/* Footer - Fixed */}
                    <Footer />
                </main>
            </div>
        </div>
    );
};

export default AdminMainComponent;