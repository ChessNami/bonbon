import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaArrowLeft, FaArrowRight, FaFilePdf, FaTimes, FaDownload } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";
import { useDetectAdBlock } from "adblock-detect-react";
import { ClipLoader } from "react-spinners";

const UserDocuments = ({ documentType }) => {
    const [files, setFiles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const itemsPerPageOptions = [4, 8, 12, 16];
    const [selectedFile, setSelectedFile] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [isFetching, setIsFetching] = useState(false); // Renamed for clarity
    const [error, setError] = useState(null);
    const adBlockDetected = useDetectAdBlock();
    const modalRef = useRef(null);

    // Ad blocker notification
    useEffect(() => {
        if (adBlockDetected) {
            Swal.fire({
                icon: "warning",
                title: "Ad Blocker Detected",
                text: "Please disable your ad blocker to view documents properly.",
                confirmButtonText: "I Understand",
                scrollbarPadding: false,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
        }
    }, [adBlockDetected]);

    // Handle clicks outside the modal
    const handleCloseModal = useCallback(() => {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
        }
        setSelectedFile(null);
        setError(null);
    }, [blobUrl]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                handleCloseModal();
            }
        };

        if (selectedFile) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedFile, handleCloseModal]);

    const fetchDocuments = useCallback(async () => {
        setIsFetching(true);
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("document_type", documentType)
                .order("created_at", { ascending: false });

            if (error) {
                throw new Error("Failed to fetch documents.");
            }

            const filesWithSignedUrls = await Promise.all(
                data.map(async (doc) => {
                    const { data: signedData, error: signedError } = await supabase.storage
                        .from("documents")
                        .createSignedUrl(doc.file_path, 3600);
                    if (signedError) {
                        console.error("Error creating signed URL:", signedError);
                        return null;
                    }
                    return {
                        id: doc.id,
                        title: doc.title,
                        fileName: doc.file_name,
                        createdAt: doc.created_at,
                        filePath: doc.file_path,
                        fileUrl: signedData.signedUrl,
                    };
                })
            );

            setFiles(filesWithSignedUrls.filter((file) => file !== null));
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
        } finally {
            setIsFetching(false);
        }
    }, [documentType]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleViewDocument = async (file) => {
        setError(null);
        setSelectedFile(file);

        try {
            if (adBlockDetected) {
                throw new Error("Ad blocker may prevent document loading");
            }

            const { data: fileData, error: downloadError } = await supabase.storage
                .from("documents")
                .download(file.filePath);

            if (downloadError) {
                throw new Error("Failed to load document: " + downloadError.message);
            }

            if (fileData.type !== "application/pdf") {
                throw new Error("File is not a valid PDF");
            }

            const newBlobUrl = URL.createObjectURL(fileData);
            setBlobUrl(newBlobUrl);
        } catch (err) {
            let errorMessage;

            if (adBlockDetected || err.message.includes("Ad blocker")) {
                errorMessage = "Document loading may be blocked by your ad blocker.";
            } else if (err.message.includes("permission") || err.message.includes("access")) {
                errorMessage = "You don't have permission to view this document.";
            } else if (err.message.includes("valid PDF")) {
                errorMessage = "The document is not a valid PDF.";
            } else {
                errorMessage = "Failed to load the document. Please try disabling your ad blocker.";
            }

            setError(errorMessage);

            Swal.fire({
                icon: "error",
                title: "Error",
                text: errorMessage,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
        }
    };

    const handleDownloadDocument = async (file) => {
        Swal.fire({
            title: "Downloading...",
            text: "Preparing your document for download.",
            toast: true,
            position: "top-end",
            allowOutsideClick: false,
            scrollbarPadding: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            if (adBlockDetected) {
                throw new Error("Ad blocker may prevent document download");
            }

            const response = await fetch(file.fileUrl);
            if (!response.ok) {
                throw new Error("Failed to fetch document");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.fileName || `${file.title}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Document downloaded successfully!",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
        } catch (err) {
            let errorMessage = "Failed to download the document.";
            if (adBlockDetected || err.message.includes("Ad blocker")) {
                errorMessage = "Download may be blocked by your ad blocker.";
            } else if (err.message.includes("fetch")) {
                errorMessage = "Network error while downloading the document.";
            }

            Swal.fire({
                icon: "error",
                title: "Error",
                text: errorMessage,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = files.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(files.length / itemsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut",
            },
        },
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30,
            },
        },
        exit: { opacity: 0, scale: 0.95 },
    };

    return (
        <div className="p-2 sm:p-4 mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-end items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Items per page:</label>
                <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="p-1 sm:p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                    {itemsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>

            {isFetching ? (
                <div className="flex justify-center items-center py-8 sm:py-12">
                    <ClipLoader color="#3B82F6" size={50} />
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-lg">
                    No documents available.
                </div>
            ) : (
                <>
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.1 } },
                        }}
                    >
                        {currentItems.map((file) => (
                            <motion.div
                                key={file.id}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer relative"
                                variants={cardVariants}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="absolute top-2 right-2 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadDocument(file);
                                        }}
                                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                        title="Download document"
                                    >
                                        <FaDownload size={14} />
                                    </button>
                                </div>
                                <div
                                    className="relative w-full pt-[100%] bg-gray-100"
                                    onClick={() => handleViewDocument(file)}
                                >
                                    <FaFilePdf
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500"
                                        size={40}
                                    />
                                </div>
                                <div className="p-3 sm:p-4" onClick={() => handleViewDocument(file)}>
                                    <h3 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">{file.title}</h3>
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">{file.fileName}</p>
                                    <p className="text-xs sm:text-sm text-gray-500">
                                        Uploaded: {new Date(file.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="flex flex-wrap justify-center items-center mt-6 sm:mt-8 gap-2 sm:gap-4">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === 1
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => paginate(page)}
                                    className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${currentPage === page
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === totalPages
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                        >
                            <FaArrowRight size={14} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {selectedFile && (
                            <motion.div
                                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    ref={modalRef}
                                    className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                                        <h2 className="text-lg sm:text-xl font-bold truncate">{selectedFile.title}</h2>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleDownloadDocument(selectedFile)}
                                                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                            >
                                                <FaDownload size={16} />
                                            </button>
                                            <button
                                                onClick={handleCloseModal}
                                                className="text-gray-500 hover:text-gray-700 transition"
                                            >
                                                <FaTimes size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {error ? (
                                        <div className="text-center py-8 sm:py-12 text-red-500 text-sm sm:text-lg">
                                            {error}
                                        </div>
                                    ) : blobUrl ? (
                                        <iframe
                                            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                            className="w-full h-[60vh] sm:h-[70vh] border-0"
                                            title={selectedFile.title}
                                            onError={() => {
                                                setError("Failed to display the document.");
                                                Swal.fire({
                                                    icon: "error",
                                                    title: "Error",
                                                    text: "Failed to display the document.",
                                                    toast: true,
                                                    position: "top-end",
                                                    showConfirmButton: false,
                                                    timer: 1500,
                                                    scrollbarPadding: false,
                                                    timerProgressBar: true,
                                                });
                                            }}
                                        />
                                    ) : (
                                        <div className="text-center py-8 sm:py-12 text-red-500 text-sm sm:text-lg">
                                            No document available to display.
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export default UserDocuments;