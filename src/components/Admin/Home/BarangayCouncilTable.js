import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const BarangayCouncilTable = () => {
    const [activeTab, setActiveTab] = useState("Barangay Officials");
    const [councilMembers, setCouncilMembers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        const names = [
            "Juan Dela Cruz", "Maria Santos", "Pedro Reyes", "Ana Mendoza",
            "Carlos Garcia", "Josefina Torres", "Ricardo Fernandez", "Luisa Diaz",
            "Manuel Cruz", "Carmen Velasquez", "Miguel Ramos", "Elena Bautista"
        ];

        const officials = [
            { title: "Punong Barangay", name: names[Math.floor(Math.random() * names.length)], isHeader: true },
            ...Array(6).fill().map(() => ({ position: "Kagawad", name: names[Math.floor(Math.random() * names.length)] })),
            { position: "Secretary", name: names[Math.floor(Math.random() * names.length)] },
            { position: "Treasurer", name: names[Math.floor(Math.random() * names.length)] }
        ];

        const skOfficials = [
            { title: "SK Chairman", name: names[Math.floor(Math.random() * names.length)], isHeader: true },
            ...Array(7).fill().map(() => ({ position: "SK Kagawad", name: names[Math.floor(Math.random() * names.length)] })),
            { position: "SK Secretary", name: names[Math.floor(Math.random() * names.length)] },
            { position: "SK Treasurer", name: names[Math.floor(Math.random() * names.length)] }
        ];

        const luponMembers = [
            { title: "Lupon Chairman", name: names[Math.floor(Math.random() * names.length)], isHeader: true },
            ...Array(8).fill().map(() => ({ position: "Lupon Member", name: names[Math.floor(Math.random() * names.length)] }))
        ];

        if (activeTab === "Barangay Officials") {
            setCouncilMembers(officials);
        } else if (activeTab === "Sangguniang Kabataan") {
            setCouncilMembers(skOfficials);
        } else if (activeTab === "Lupon Members") {
            setCouncilMembers(luponMembers);
        }

        setCurrentPage(1);
    }, [activeTab]);

    const totalPages = Math.ceil(councilMembers.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = councilMembers.slice(indexOfFirstRow, indexOfLastRow);

    return (
        <div className="bg-white p-4 rounded-lg flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4">Barangay Council</h2>

            {/* Tabs with Animation */}
            <div className="flex justify-center border-b pb-2">
                <div className="flex space-x-4">
                    {["Barangay Officials", "Sangguniang Kabataan", "Lupon Members"].map((tab) => (
                        <button
                            key={tab}
                            className={`px-4 py-2 font-semibold relative transition-colors duration-300 ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500"}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table with Smooth Transition */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 overflow-y-auto mt-4"
                >
                    <table className="w-full border-collapse border border-gray-300">
                        <tbody>
                            {currentRows.map((member, index) => (
                                <motion.tr
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className={member.isHeader ? "bg-gray-200" : ""}
                                >
                                    {member.isHeader ? (
                                        <td colSpan="2" className="text-center font-semibold p-3 border border-gray-300">
                                            {member.title} {member.name && ` - ${member.name}`}
                                        </td>
                                    ) : (
                                        <>
                                            <td className="p-3 border border-gray-300">{member.position}</td>
                                            <td className="p-3 border border-gray-300">{member.name}</td>
                                        </>
                                    )}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </AnimatePresence>

            {/* Pagination (Sticks to Bottom) */}
            <div className="flex justify-between items-center bg-gray-100 p-2 border-t border-gray-300">
                <button
                    className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50 flex items-center gap-1"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    <FaChevronLeft />
                    Prev
                </button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <button
                    className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50 flex items-center gap-1"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Next
                    <FaChevronRight />
                </button>
            </div>
        </div>
    );
};

export default BarangayCouncilTable;