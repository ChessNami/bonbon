import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";
import placeholderImage from "../../../img/Placeholder/placeholder.png";

const BarangayCouncilTable = () => {
    const [activeTab, setActiveTab] = useState("Barangay Officials");
    const [councilMembers, setCouncilMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [selectedOfficial, setSelectedOfficial] = useState(null);
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchOfficials = async () => {
            setLoading(true);
            try {
                let tableName, bucketName;
                if (activeTab === "Barangay Officials") {
                    tableName = "barangay_officials";
                    bucketName = "barangayofficials";
                } else {
                    tableName = "sk_officials";
                    bucketName = "skofficials";
                }

                const { data: officials, error } = await supabase
                    .from(tableName)
                    .select("id, name, position, official_type, image_url, is_current, start_year, end_year")
                    .eq("is_current", true);

                if (error) throw error;

                const membersWithSignedUrls = await Promise.all(
                    (officials || []).map(async (official) => {
                        let signedImageUrl = placeholderImage;
                        if (official.image_url) {
                            const defaultFileName = activeTab === "Barangay Officials"
                                ? `public/official_${official.id}.jpg`
                                : `public/sk_official_${official.id}.jpg`;
                            const filePath = official.image_url.includes(`/${bucketName}/`)
                                ? official.image_url.split(`/${bucketName}/`)[1]
                                : defaultFileName;

                            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                .from(bucketName)
                                .createSignedUrl(filePath, 7200);

                            if (!signedUrlError && signedUrlData) {
                                signedImageUrl = signedUrlData.signedUrl;
                            }
                        }

                        const lastName = official.name.trim().split(" ").slice(-1)[0].toLowerCase();

                        return {
                            id: official.id,
                            name: official.name,
                            position: official.position,
                            official_type: official.official_type || "N/A",
                            signedImageUrl,
                            lastName,
                            term: `${official.start_year || "—"} – Present`,
                            // Priority flags
                            isCaptain: activeTab === "Barangay Officials"
                                ? /punong barangay|barangay captain|kapitan/i.test(official.position)
                                : /sk chairman|chairman|sk chairperson/i.test(official.position),
                            isSecretary: /secretary/i.test(official.position),
                            isTreasurer: /treasurer/i.test(official.position),
                            isKagawad: /kagawad/i.test(official.position),
                        };
                    })
                );

                // Final sorting logic
                const sortedMembers = membersWithSignedUrls.sort((a, b) => {
                    // 1. Captain/Chairman always first
                    if (a.isCaptain && !b.isCaptain) return -1;
                    if (!a.isCaptain && b.isCaptain) return 1;

                    // 2. For Barangay: Secretary → Treasurer → Kagawad (by last name)
                    if (activeTab === "Barangay Officials") {
                        if (a.isSecretary && !b.isSecretary) return -1;
                        if (!a.isSecretary && b.isSecretary) return 1;
                        if (a.isTreasurer && !b.isTreasurer) return -1;
                        if (!a.isTreasurer && b.isTreasurer) return 1;
                    }

                    // 3. Kagawad or SK non-chairman: sort by last name
                    if ((a.isKagawad || !a.isCaptain) && (b.isKagawad || !b.isCaptain)) {
                        return a.lastName.localeCompare(b.lastName);
                    }

                    return 0;
                });

                setCouncilMembers(sortedMembers);
            } catch (error) {
                console.error("Error fetching officials:", error);
                setCouncilMembers([]);
            } finally {
                setLoading(false);
                setCurrentPage(1);
            }
        };

        fetchOfficials();
    }, [activeTab]);

    // Close modal on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setSelectedOfficial(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const setDisplayItems = (count) => {
        const validCount = Math.max(1, Math.min(count, 12));
        setItemsPerPage(validCount);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(councilMembers.length / itemsPerPage);
    const indexOfLastRow = currentPage * itemsPerPage;
    const indexOfFirstRow = indexOfLastRow - itemsPerPage;
    const currentRows = councilMembers.slice(indexOfFirstRow, indexOfLastRow);

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
        if (startPage > 1) { pageNumbers.unshift("..."); pageNumbers.unshift(1); }
        if (endPage < totalPages) { pageNumbers.push("..."); pageNumbers.push(totalPages); }
        return pageNumbers;
    };

    return (
        <div className="bg-white p-6 rounded-md shadow-md flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Barangay Council</h2>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("Barangay Officials")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "Barangay Officials"
                                ? "bg-white shadow-sm text-blue-600"
                                : "text-gray-600 hover:text-gray-800"
                                }`}
                        >
                            Barangay Officials
                        </button>
                        <button
                            onClick={() => setActiveTab("Sangguniang Kabataan")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "Sangguniang Kabataan"
                                ? "bg-white shadow-sm text-blue-600"
                                : "text-gray-600 hover:text-gray-800"
                                }`}
                        >
                            SK Officials
                        </button>
                    </div>
                    <select
                        className="p-2 border rounded-md text-sm"
                        value={itemsPerPage}
                        onChange={(e) => setDisplayItems(Number(e.target.value))}
                    >
                        {[3, 6, 9, 12].map((count) => (
                            <option key={count} value={count}>Show {count}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                </div>
            ) : councilMembers.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-lg">No current officials found.</p>
                </div>
            ) : (
                <>
                    {/* Grid of Officials */}
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        {currentRows.map((member, index) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-gray-50 rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${member.isCaptain ? "border-blue-500" : "border-transparent"
                                    }`}
                                onClick={() => setSelectedOfficial(member)}
                            >
                                <div className="relative aspect-square bg-gray-100">
                                    <img
                                        src={member.signedImageUrl}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = placeholderImage; }}
                                    />
                                    {member.isCaptain && (
                                        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                            HEAD
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 text-center">
                                    <h3 className={`font-bold text-lg ${member.isCaptain ? "text-blue-700" : "text-gray-800"}`}>
                                        {member.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">{member.position}</p>
                                    <p className="text-xs text-gray-500 mt-2">{member.term}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center mt-8 space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <FaChevronLeft className="text-gray-700" />
                            </button>
                            {getPageNumbers().map((page, i) => (
                                <button
                                    key={i}
                                    onClick={() => typeof page === "number" && setCurrentPage(page)}
                                    disabled={page === "..."}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${page === currentPage
                                        ? "bg-blue-600 text-white"
                                        : page === "..."
                                            ? "text-gray-500 cursor-default"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <FaChevronRight className="text-gray-700" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Perfectly Responsive View Modal — Works Everywhere */}
            <AnimatePresence>
                {selectedOfficial && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedOfficial(null)}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-[90vw]   overflow-hidden
                   sm:max-w-md 
                   md:max-w-lg 
                   lg:max-w-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Image - Responsive Height */}
                            <div className="relative w-full h-56 sm:h-64 md:h-80 lg:h-96">
                                <img
                                    src={selectedOfficial.signedImageUrl}
                                    alt={selectedOfficial.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target.src = placeholderImage)}
                                />

                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedOfficial(null)}
                                    className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition"
                                >
                                    <FaTimes className="w-5 h-5 text-gray-700" />
                                </button>

                                {/* Head Badge */}
                                {selectedOfficial.isCaptain && (
                                    <div className="absolute top-3 left-3 bg-blue-600 text-white font-bold text-xs sm:text-sm px-3 py-1.5 rounded-full shadow-lg">
                                        HEAD OFFICIAL
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 sm:p-8 text-center">
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 leading-tight">
                                    {selectedOfficial.name}
                                </h3>
                                <p className="text-lg sm:text-xl text-blue-600 font-medium mt-2">
                                    {selectedOfficial.position}
                                </p>
                                <p className="text-base text-gray-700 mt-2">
                                    {selectedOfficial.official_type}
                                </p>
                                <p className="text-sm text-gray-500 mt-5 font-medium">
                                    Term: <span className="text-blue-600 font-bold">{selectedOfficial.term}</span>
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BarangayCouncilTable;