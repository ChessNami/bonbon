import React, { useState, useRef, useEffect, useCallback } from "react";
import { FaPlus, FaTimes, FaArrowLeft, FaArrowRight, FaFilePdf, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const AdminBudgetReports = () => {
    const [files, setFiles] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentFile, setCurrentFile] = useState(null);
    const [formData, setFormData] = useState({ title: "", file: null });
    const [errors, setErrors] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const itemsPerPageOptions = [4, 8, 12, 16];
    const modalRef = useRef(null);

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
            });
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Document title is required.";
        if (modalMode === "create" && !formData.file) newErrors.file = "PDF file is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (modalMode === "create") {
            const newFile = {
                id: files.length + 1,
                title: formData.title,
                fileName: formData.file.name,
                createdAt: new Date().toISOString(),
                fileUrl: `https://example.com/pdf/${formData.file.name}`,
            };
            setFiles([...files, newFile]);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "File added successfully",
                showConfirmButton: false,
                timer: 1500,
            });
        } else if (modalMode === "edit" && currentFile) {
            setFiles(
                files.map((file) =>
                    file.id === currentFile.id ? { ...file, title: formData.title } : file
                )
            );
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "File updated successfully",
                showConfirmButton: false,
                timer: 1500,
            });
        }

        setFormData({ title: "", file: null });
        setIsModalOpen(false);
        setCurrentFile(null);
    };

    const handleEdit = (file) => {
        setModalMode("edit");
        setCurrentFile(file);
        setFormData({ title: file.title, file: null });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = (file) => {
        setFiles(files.filter((f) => f.id !== file.id));
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "File deleted successfully",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setModalMode("create");
        setCurrentFile(null);
        setFormData({ title: "", file: null });
        setErrors({});
    }, []);

    const handleOutsideClick = useCallback(
        (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                closeModal();
            }
        },
        [modalRef, closeModal]
    );

    useEffect(() => {
        if (isModalOpen) {
            document.addEventListener("mousedown", handleOutsideClick);
        } else {
            document.removeEventListener("mousedown", handleOutsideClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isModalOpen, handleOutsideClick]);

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
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.8 },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    return (
        <div className="p-4 mx-auto">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
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
                    <label className="text-sm font-medium text-gray-700">Items per page:</label>
                    <select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        {itemsPerPageOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {files.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                    No files available. Add a new file to get started.
                </div>
            ) : (
                <>
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
                            >
                                <div className="relative w-full pt-[100%] bg-gray-100">
                                    <FaFilePdf
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500"
                                        size={60}
                                    />
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <a
                                            href={file.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                                        >
                                            <FaEye size={14} />
                                        </a>
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
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-gray-800">{file.title}</h3>
                                    <p className="text-sm text-gray-600 truncate">{file.fileName}</p>
                                    <p className="text-sm text-gray-500">
                                        Uploaded: {new Date(file.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="flex justify-center items-center mt-8 space-x-4">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === 1
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                        >
                            <FaArrowLeft size={16} />
                        </button>
                        <div className="flex space-x-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => paginate(page)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === page
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
                            <FaArrowRight size={16} />
                        </button>
                    </div>
                </>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {modalMode === "create" ? "Add New Document" : "Edit Document"}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Document Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className={`w-full p-2 border rounded ${errors.title ? "border-red-500" : "border-gray-300"
                                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    />
                                    {errors.title && (
                                        <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                                    )}
                                </div>
                                {modalMode === "create" && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">PDF File</label>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            className={`w-full p-2 border rounded ${errors.file ? "border-red-500" : "border-gray-300"
                                                }`}
                                        />
                                        {errors.file && (
                                            <p className="text-red-500 text-xs mt-1">{errors.file}</p>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-end space-x-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                                    >
                                        {modalMode === "create" ? "Submit" : "Save"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBudgetReports;