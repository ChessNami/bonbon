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
                    .select("id, name, position, official_type, image_url");

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

                            if (signedUrlError) {
                                console.error(`Error generating signed URL for ${official.name} (ID: ${official.id}):`, signedUrlError);
                            } else {
                                signedImageUrl = signedUrlData.signedUrl;
                            }
                        }

                        return {
                            id: official.id,
                            position: official.position,
                            name: official.name,
                            official_type: official.official_type || "N/A",
                            signedImageUrl,
                            isHeader:
                                (activeTab === "Barangay Officials" &&
                                    (official.position.toLowerCase().includes("punong barangay") ||
                                        official.position.toLowerCase().includes("barangay captain") ||
                                        official.position.toLowerCase().includes("barangay kapitan"))) ||
                                (activeTab === "Sangguniang Kabataan" &&
                                    (official.position.toLowerCase().includes("sk chairman") ||
                                        official.position.toLowerCase().includes("chairman") ||
                                        official.position.toLowerCase().includes("sk chairperson"))),
                        };
                    })
                );

                // Sort members to prioritize Punong Barangay or SK Chairman
                const sortedMembers = membersWithSignedUrls.sort((a, b) => {
                    const priorityPosition = activeTab === "Barangay Officials" ? "punong barangay" : "sk chairman";
                    const aIsPriority = a.position.toLowerCase().includes(priorityPosition);
                    const bIsPriority = b.position.toLowerCase().includes(priorityPosition);

                    if (aIsPriority && !bIsPriority) return -1;
                    if (!aIsPriority && bIsPriority) return 1;
                    return 0; // Maintain original order for non-priority items
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

    // Handle outside click to close modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setSelectedOfficial(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (selectedOfficial) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [selectedOfficial]);

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

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        if (startPage > 1) {
            pageNumbers.unshift("...");
            pageNumbers.unshift(1);
        }
        if (endPage < totalPages) {
            pageNumbers.push("...");
            pageNumbers.push(totalPages);
        }

        return pageNumbers;
    };

    return (
        <div className="bg-white p-6 rounded-md shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Barangay Council</h2>
                <select
                    className="p-2 border rounded-md"
                    value={itemsPerPage}
                    onChange={(e) => setDisplayItems(Number(e.target.value))}
                >
                    {[3, 6, 9, 12].map((count) => (
                        <option key={count} value={count}>
                            Show {count} items
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex justify-center border-b border-gray-200 mb-6">
                {["Barangay Officials", "Sangguniang Kabataan"].map((tab) => (
                    <button
                        key={tab}
                        className={`px-6 py-3 text-sm font-medium transition-colors duration-300 relative ${activeTab === tab
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-blue-600"
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                >
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
                        </div>
                    ) : currentRows.length === 0 ? (
                        <p className="text-center text-gray-500 text-lg">No officials available.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentRows.map((member, index) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.1 }}
                                    className={`bg-gray-50 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer ${member.isHeader
                                            ? "border-4 border-blue-400 bg-blue-50"
                                            : ""
                                        }`}
                                    onClick={() => setSelectedOfficial(member)}
                                >
                                    <div className="w-full aspect-square bg-gray-100 relative">
                                        <img
                                            src={member.signedImageUrl}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error(
                                                    `Failed to load image for ${member.name}:`,
                                                    member.signedImageUrl
                                                );
                                                e.target.src = placeholderImage;
                                            }}
                                        />
                                        {member.isHeader && (
                                            <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                                Head Official
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 text-center">
                                        <h3
                                            className={`text-lg font-semibold ${member.isHeader
                                                    ? "text-blue-700"
                                                    : "text-gray-800"
                                                } uppercase truncate`}
                                        >
                                            {member.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 truncate">
                                            {member.position}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                    <button
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition disabled:cursor-not-allowed"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <FaChevronLeft className="text-gray-600" />
                    </button>
                    {getPageNumbers().map((page, index) => (
                        <button
                            key={index}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${page === currentPage
                                    ? "bg-blue-600 text-white"
                                    : page === "..."
                                        ? "text-gray-500 cursor-default"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                            onClick={() => typeof page === "number" && setCurrentPage(page)}
                            disabled={page === "..."}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition disabled:cursor-not-allowed"
                        onClick={() =>
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                    >
                        <FaChevronRight className="text-gray-600" />
                    </button>
                </div>
            )}

            <AnimatePresence>
                {selectedOfficial && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white p-0 rounded-lg shadow-lg w-full max-w-md"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
                                <h2 className="text-xl font-bold text-gray-800">Official Details</h2>
                                <button
                                    onClick={() => setSelectedOfficial(null)}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[80vh]">
                                <div className="flex flex-col items-center">
                                    <div className="w-full h-auto mb-4">
                                        <img
                                            src={selectedOfficial.signedImageUrl}
                                            alt={selectedOfficial.name}
                                            className="w-full h-full object-cover rounded-lg"
                                            onError={(e) => {
                                                console.error(
                                                    `Failed to load image for ${selectedOfficial.name}:`,
                                                    selectedOfficial.signedImageUrl
                                                );
                                                e.target.src = placeholderImage;
                                            }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                            {selectedOfficial.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-1">
                                            {selectedOfficial.position}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {selectedOfficial.official_type}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BarangayCouncilTable;