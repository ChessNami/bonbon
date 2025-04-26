import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrash, FaTimes, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '../../../supabaseClient';
import Compressor from 'compressorjs';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import placeholderImage from '../../../img/Placeholder/placeholder.png';
import Loader from '../../Loader';

const BarangayOfficials = () => {
    const [officials, setOfficials] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentOfficial, setCurrentOfficial] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        position: "Kagawad",
        official_type: "",
        image: null,
        image_preview: "",
        croppedImage: null,
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const cropperRef = useRef(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const itemsPerPageOptions = [4, 8, 12, 16];

    useEffect(() => {
        fetchOfficials();
    }, []);

    const fetchOfficials = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('barangay_officials')
                .select('*');

            if (error) throw error;

            const officialsWithSignedUrls = await Promise.all(
                (data || []).map(async (official) => {
                    if (official.image_url) {
                        const filePath = official.image_url.split('/barangayofficials/')[1] || `public/official_${official.id}.jpg`;
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('barangayofficials')
                            .createSignedUrl(filePath, 3600);

                        if (signedUrlError) {
                            console.error(`Error generating signed URL for ${official.name}:`, signedUrlError);
                            return { ...official, signedImageUrl: placeholderImage };
                        }

                        return { ...official, signedImageUrl: signedUrlData.signedUrl };
                    }
                    return { ...official, signedImageUrl: placeholderImage };
                })
            );

            // Sort officials with Punong Barangay first
            const sortedOfficials = officialsWithSignedUrls.sort((a, b) => {
                if (a.position === "Punong Barangay") return -1;
                if (b.position === "Punong Barangay") return 1;
                return a.name.localeCompare(b.name);
            });

            setOfficials(sortedOfficials);
        } catch (error) {
            console.error('Error fetching officials:', error);
            Swal.fire({
                icon: "error",
                title: "Fetch Error",
                text: "Failed to fetch officials. Check console for details.",
            });
            setOfficials([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: "" });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
            setFormData({
                ...formData,
                image: file,
                image_preview: URL.createObjectURL(file),
                croppedImage: null,
            });
            setErrors({ ...errors, image: "" });
        } else {
            setErrors({ ...errors, image: "Please upload a PNG or JPEG/JPG file." });
            Swal.fire({
                icon: "error",
                title: "Invalid File",
                text: "Only PNG and JPEG/JPG files are allowed.",
            });
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required.";
        if (!formData.position.trim()) newErrors.position = "Position is required.";
        if (!formData.official_type.trim()) newErrors.official_type = "Official type is required.";
        if (!formData.image && modalMode === "create") newErrors.image = "Image is required for new officials.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = () => {
        setModalMode("create");
        setFormData({
            name: "",
            position: "Kagawad",
            official_type: "",
            image: null,
            image_preview: "",
            croppedImage: null,
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleEdit = (official) => {
        setModalMode("edit");
        setCurrentOfficial(official);
        setFormData({
            name: official.name,
            position: official.position,
            official_type: official.official_type,
            image: null,
            image_preview: "",
            croppedImage: null,
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = (official) => {
        setModalMode("delete");
        setCurrentOfficial(official);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            Swal.fire({
                title: 'Processing...',
                text: `Please wait while we ${modalMode === "create" ? "add" : "update"} the official.`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            let officialId = null;

            if (modalMode === "create" && formData.image) {
                if (cropperRef.current && cropperRef.current.cropper) {
                    const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
                        width: 600,
                        height: 600,
                    });

                    // Create a new canvas with white background
                    const whiteBgCanvas = document.createElement('canvas');
                    whiteBgCanvas.width = 600;
                    whiteBgCanvas.height = 600;
                    const ctx = whiteBgCanvas.getContext('2d');

                    ctx.fillStyle = "#ffffff"; // White background
                    ctx.fillRect(0, 0, whiteBgCanvas.width, whiteBgCanvas.height);
                    ctx.drawImage(croppedCanvas, 0, 0);

                    const compressedImage = await new Promise((resolve, reject) => {
                        whiteBgCanvas.toBlob((blob) => {
                            if (blob) {
                                new Compressor(blob, {
                                    quality: 0.8,
                                    maxWidth: 800,
                                    maxHeight: 800,
                                    success: (compressedResult) => resolve(compressedResult),
                                    error: (err) => reject(new Error(`Image compression failed: ${err.message}`)),
                                });
                            } else {
                                reject(new Error("Cropping failed: No blob generated."));
                            }
                        }, 'image/jpeg');
                    });

                    // Insert the official data first
                    const { data: insertData, error: insertError } = await supabase
                        .from('barangay_officials')
                        .insert([{
                            name: formData.name,
                            position: formData.position,
                            official_type: formData.official_type,
                        }])
                        .select('id');

                    if (insertError) throw new Error(`Error inserting official: ${insertError.message}`);

                    officialId = insertData[0].id;
                    const fileName = `public/official_${officialId}.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('barangayofficials')
                        .upload(fileName, compressedImage, {
                            cacheControl: '3600',
                            upsert: true,
                        });

                    if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);

                    const { error: updateError } = await supabase
                        .from('barangay_officials')
                        .update({ image_url: fileName })
                        .eq('id', officialId);

                    if (updateError) throw new Error(`Error updating image URL: ${updateError.message}`);
                }
            } else if (modalMode === "edit" && currentOfficial) {
                const { error: updateError } = await supabase
                    .from('barangay_officials')
                    .update({
                        name: formData.name,
                        position: formData.position,
                        official_type: formData.official_type,
                    })
                    .eq('id', currentOfficial.id);

                if (updateError) throw new Error(`Error updating official: ${updateError.message}`);
            }

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: `Official ${modalMode === "create" ? "added" : "updated"} successfully`,
                showConfirmButton: false,
                timer: 1500,
            });

            await fetchOfficials();
            setIsModalOpen(false);

        } catch (error) {
            Swal.close();
            console.error('Error in handleSubmit:', error);
            Swal.fire({
                icon: "error",
                title: "Operation Failed",
                text: error.message || "An unexpected error occurred. Please try again.",
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (currentOfficial) {
            try {
                Swal.fire({
                    title: 'Processing...',
                    text: 'Please wait while we delete the official.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                if (currentOfficial.image_url) {
                    const filePath = currentOfficial.image_url.split('/barangayofficials/')[1] || `public/official_${currentOfficial.id}.jpg`;
                    await supabase.storage
                        .from('barangayofficials')
                        .remove([filePath]);
                }

                const { error } = await supabase
                    .from('barangay_officials')
                    .delete()
                    .eq('id', currentOfficial.id);

                if (error) throw new Error(`Error deleting official: ${error.message}`);

                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Official deleted successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });

                await fetchOfficials();
            } catch (error) {
                Swal.close();
                console.error('Error deleting official:', error);
                Swal.fire({
                    icon: "error",
                    title: "Delete Failed",
                    text: error.message || "An unexpected error occurred. Please try again.",
                });
            }
        }
        setIsModalOpen(false);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentOfficial(null);
        setFormData({
            name: "",
            position: "Kagawad",
            official_type: "",
            image: null,
            image_preview: "",
            croppedImage: null,
        });
        setErrors({});
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = officials.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(officials.length / itemsPerPage);

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
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-md"
                >
                    <FaPlus className="mr-2" /> Add Official
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

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader />
                </div>
            ) : officials.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                    No officials available. Add a new official to get started.
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
                        {currentItems.map((official) => (
                            <motion.div
                                key={official.id}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                                variants={cardVariants}
                            >
                                <div className="relative w-full pt-[100%]">
                                    <img
                                        src={official.signedImageUrl || placeholderImage}
                                        alt={official.name}
                                        className="absolute top-0 left-0 w-full h-full object-cover rounded-t-lg"
                                        onError={(e) => {
                                            console.error(`Failed to load signed image for ${official.name}:`, official.signedImageUrl);
                                            e.target.src = placeholderImage;
                                        }}
                                    />
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(official)}
                                            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(official)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-gray-800">{official.name}</h3>
                                    <p className="text-sm text-gray-600">{official.position}</p>
                                    <p className="text-sm text-gray-500">{official.official_type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Pagination Controls */}
                    <div className="flex justify-center items-center mt-8 space-x-4">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === 1
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
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
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
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
                            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {modalMode === "create" && "Add New Official"}
                                    {modalMode === "edit" && "Edit Official"}
                                    {modalMode === "delete" && "Confirm Delete"}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {modalMode === "create" && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Position</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.position && (
                                                <p className="text-red-500 text-xs mt-1">{errors.position}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.official_type && (
                                                <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Image (PNG/JPEG)</label>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg"
                                                onChange={handleImageChange}
                                                className={`w-full p-2 border rounded ${errors.image ? "border-red-500" : "border-gray-300"
                                                    }`}
                                            />
                                            {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                                        </div>

                                        {formData.image_preview && (
                                            <div className="mt-4">
                                                <Cropper
                                                    ref={cropperRef}
                                                    src={formData.image_preview}
                                                    style={{ height: 300, width: "100%" }}
                                                    aspectRatio={1}
                                                    guides={true}
                                                    cropBoxMovable={true}
                                                    cropBoxResizable={true}
                                                    zoomable={true}
                                                    scalable={true}
                                                    viewMode={1}
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </div>

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
                                            Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === "edit" && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Position</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.position && (
                                                <p className="text-red-500 text-xs mt-1">{errors.position}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : "border-gray-300"
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.official_type && (
                                                <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>
                                            )}
                                        </div>
                                    </div>

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
                                            Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === "delete" && currentOfficial && (
                                <div className="space-y-4">
                                    <p className="text-sm">Are you sure you want to delete {currentOfficial.name}?</p>
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={closeModal}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteConfirm}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BarangayOfficials;