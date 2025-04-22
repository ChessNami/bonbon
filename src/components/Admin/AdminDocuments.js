import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    FaPlus,
    FaTimes,
    FaArrowLeft,
    FaArrowRight,
    FaFilePdf,
    FaEye,
    FaEdit,
    FaTrash,
    FaDownload,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../supabaseClient";
import { useDetectAdBlock } from "adblock-detect-react";
import { ClipLoader } from "react-spinners";

const AdminDocuments = ({ documentType }) => {
    const [files, setFiles] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentFile, setCurrentFile] = useState(null);
    const [formData, setFormData] = useState({ title: "", file: null });
    const [errors, setErrors] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [selectedFile, setSelectedFile] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewError, setViewError] = useState(null);
    const itemsPerPageOptions = [4, 8, 12, 16];
    const formModalRef = useRef(null);
    const viewModalRef = useRef(null);
    const adBlockDetected = useDetectAdBlock();

    const handleDownload = (file) => {
        const link = document.createElement("a");
        link.href = file.fileUrl;
        link.download = file.fileName || file.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
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
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [documentType]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: "" });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setFormData({ ...formData, file });
            setErrors({ ...errors, file: "" });
        } else {
            setErrors({ ...errors, file: "Please upload a PDF file." });
            Swal.fire({
                icon: "error",
                title: "Invalid File",
                text: "Only PDF files are allowed.",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Document title is required.";
        if (modalMode === "create" && !formData.file)
            newErrors.file = "PDF file is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        let loadingSwal = null;

        try {
            if (modalMode === "create") {
                loadingSwal = Swal.fire({
                    title: "Uploading...",
                    text: "Please wait while your document is being uploaded",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });

                const file = formData.file;
                const sanitizedFileName = file.name
                    .replace(/[^a-zA-Z0-9.-]/g, "_")
                    .replace(/_+/g, "_");
                const filePath = `${documentType}/${Date.now()}_${sanitizedFileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("documents")
                    .upload(filePath, file);

                if (uploadError) {
                    throw new Error("File upload failed: " + uploadError.message);
                }

                const { error: insertError } = await supabase.from("documents").insert({
                    title: formData.title,
                    file_name: sanitizedFileName,
                    file_path: filePath,
                    document_type: documentType,
                    created_by: (await supabase.auth.getUser()).data.user.id,
                });

                if (insertError) {
                    throw new Error("Database insert failed: " + insertError.message);
                }

                await loadingSwal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "File added successfully",
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                });
            } else if (modalMode === "edit" && currentFile) {
                const { error } = await supabase
                    .from("documents")
                    .update({ title: formData.title })
                    .eq("id", currentFile.id);

                if (error) {
                    throw new Error("Update failed: " + error.message);
                }

                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "File updated successfully",
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                });
            }

            setFormData({ title: "", file: null });
            setIsModalOpen(false);
            setCurrentFile(null);
            fetchDocuments();
        } catch (error) {
            if (loadingSwal) await loadingSwal.close();
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
        }
    };

    const handleEdit = (file) => {
        setModalMode("edit");
        setCurrentFile(file);
        setFormData({ title: file.title, file: null });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = async (file) => {
        Swal.fire({
            title: "Are you sure?",
            text: "This will permanently delete the document and its file.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const filePath = file.filePath;
                    const { error: storageError } = await supabase.storage
                        .from("documents")
                        .remove([filePath]);

                    if (storageError) {
                        throw new Error("File deletion failed: " + storageError.message);
                    }

                    const { error: dbError } = await supabase
                        .from("documents")
                        .delete()
                        .eq("id", file.id);

                    if (dbError) {
                        throw new Error("Database deletion failed: " + dbError.message);
                    }

                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: "File deleted successfully",
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true,
                    });

                    fetchDocuments();
                } catch (error) {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: error.message,
                        toast: true,
                        position: "top-end",
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true,
                    });
                }
            }
        });
    };

    const handleViewDocument = async (file) => {
        setIsLoading(true);
        setViewError(null);
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

            setViewError(errorMessage);

            Swal.fire({
                icon: "error",
                title: "Error",
                text: errorMessage,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseViewModal = useCallback(() => {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
        }
        setSelectedFile(null);
        setViewError(null);
        setIsLoading(false);
    }, [blobUrl]);

    const closeFormModal = useCallback(() => {
        setIsModalOpen(false);
        setModalMode("create");
        setCurrentFile(null);
        setFormData({ title: "", file: null });
        setErrors({});
    }, []);

    const handleOutsideClick = useCallback(
        (e) => {
            if (formModalRef.current && !formModalRef.current.contains(e.target)) {
                closeFormModal();
            }
            if (viewModalRef.current && !viewModalRef.current.contains(e.target)) {
                handleCloseViewModal();
            }
        },
        [formModalRef, viewModalRef, closeFormModal, handleCloseViewModal]
    );

    useEffect(() => {
        if (isModalOpen || selectedFile) {
            document.addEventListener("mousedown", handleOutsideClick);
        } else {
            document.removeEventListener("mousedown", handleOutsideClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isModalOpen, selectedFile, handleOutsideClick]);

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

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 },
        },
        exit: { opacity: 0, scale: 0.95 },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    };

    return (
        <div className="p-4 mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 sm:gap-4">
                <button
                    onClick={() => {
                        setModalMode("create");
                        setIsModalOpen(true);
                    }}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-md"
                >
                    <FaPlus className="mr-2" /> Add File
                </button>
                <div className="flex items-center space-x-2">
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
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-8 sm:py-12">
                    <ClipLoader color="#3B82F6" size={50} />
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-lg">
                    No files available. Add a new file to get started.
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
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                                variants={cardVariants}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="relative w-full pt-[100%] bg-gray-100">
                                    <FaFilePdf
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500"
                                        size={40}
                                    />
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <button
                                            onClick={() => handleViewDocument(file)}
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                                        >
                                            <FaEye size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(file)}
                                            className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition"
                                        >
                                            <FaDownload size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(file)}
                                            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4">
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
                </>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={formModalRef}
                            className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-3 sm:mb-4">
                                <h2 className="text-lg sm:text-xl font-bold">
                                    {modalMode === "create" ? "Add New Document" : "Edit Document"}
                                </h2>
                                <button
                                    onClick={closeFormModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium mb-1">Document Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className={`w-full p-2 border rounded ${errors.title ? "border-red-500" : "border-gray-300"
                                            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm`}
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>
                                {modalMode === "create" && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium mb-1">PDF File</label>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            className={`w-full p-2 border rounded ${errors.file ? "border-red-500" : "border-gray-300"
                                                } text-xs sm:text-sm`}
                                        />
                                        {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
                                    </div>
                                )}
                                <div className="flex justify-end space-x-2 mt-4 sm:mt-6">
                                    <button
                                        type="button"
                                        onClick={closeFormModal}
                                        className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-xs sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs sm:text-sm"
                                    >
                                        {modalMode === "create" ? "Submit" : "Save"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                {selectedFile && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={viewModalRef}
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
                                        onClick={() => handleDownload(selectedFile)}
                                        className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition"
                                    >
                                        <FaDownload size={16} />
                                    </button>
                                    <button
                                        onClick={handleCloseViewModal}
                                        className="text-gray-500 hover:text-gray-700 transition"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                </div>
                            </div>
                            {isLoading ? (
                                <div className="flex justify-center items-center py-8 sm:py-12">
                                    <ClipLoader color="#3B82F6" size={50} />
                                </div>
                            ) : viewError ? (
                                <div className="text-center py-8 sm:py-12 text-red-500 text-sm sm:text-lg">
                                    {viewError}
                                </div>
                            ) : blobUrl ? (
                                <iframe
                                    src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                    className="w-full h-[60vh] sm:h-[70vh] border-0"
                                    title={selectedFile.title}
                                    onError={() => {
                                        setViewError("Failed to display the document.");
                                        Swal.fire({
                                            icon: "error",
                                            title: "Error",
                                            text: "Failed to display the document.",
                                            toast: true,
                                            position: "top-end",
                                            showConfirmButton: false,
                                            timer: 1500,
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
        </div>
    );
};

export default AdminDocuments;