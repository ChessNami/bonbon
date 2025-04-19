// src/components/Admin/BarangayOfficials.js
import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '../../supabaseClient';
import Compressor from 'compressorjs';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import placeholderImage from '../../img/Placeholder/placeholder.png';
import Loader from '../Loader';

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

            setOfficials(officialsWithSignedUrls);
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
                text: 'Please wait while we save the official.',
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

                    // Upload the image
                    const { error: uploadError } = await supabase.storage
                        .from('barangayofficials')
                        .upload(fileName, compressedImage, {
                            cacheControl: '3600',
                            upsert: true,
                        });

                    if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);

                    // Update the official with the image URL
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

                Swal.close(); // Close loader before showing success
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Official updated successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });

                fetchOfficials();
                setIsModalOpen(false);
                return;
            }

            if (modalMode === "create") {
                Swal.close(); // Close loader before showing success
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Official added successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });
            }

            await fetchOfficials();
            setIsModalOpen(false);

        } catch (error) {
            Swal.close(); // Close loader on error
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
            // Delete the image from storage if it exists
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

            if (error) {
                console.error('Error deleting official:', error);
            } else {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Official deleted successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });
                fetchOfficials();
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

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.8 },
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <button
                    onClick={handleCreate}
                    className="px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 bg-green-500 text-white rounded hover:bg-green-600 flex items-center shadow-md text-sm sm:text-base"
                >
                    <FaPlus className="mr-2" /> Add Official
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-md">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 md:px-4 md:py-3 text-left text-xs sm:text-sm md:text-base">Name</th>
                            <th className="border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 md:px-4 md:py-3 text-left text-xs sm:text-sm md:text-base">Position</th>
                            <th className="border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 md:px-4 md:py-3 text-left text-xs sm:text-sm md:text-base">Official Type</th>
                            <th className="border border-gray-300 px-2 py-1 sm:px-3 sm:py-2 md:px-4 md:py-3 text-center text-xs sm:text-sm md:text-base">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="text-center py-4">
                                    <div className="inline-block">
                                        <Loader />
                                    </div>
                                </td>
                            </tr>
                        ) : officials.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center py-4 text-gray-500 text-sm sm:text-base">
                                    No data available.
                                </td>
                            </tr>
                        ) : (
                            officials.map((official) => (
                                <tr key={official.id} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-6 lg:py-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={official.signedImageUrl || placeholderImage}
                                                alt={official.name}
                                                className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded object-cover mr-2"
                                                onError={(e) => {
                                                    console.error(`Failed to load signed image for ${official.name}:`, official.signedImageUrl);
                                                    e.target.src = placeholderImage;
                                                }}
                                            />
                                            <span className="text-xs sm:text-sm md:text-base">{official.name}</span>
                                        </div>
                                    </td>
                                    <td className="border border-gray-300 px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-6 lg:py-4 text-xs sm:text-sm md:text-base">{official.position}</td>
                                    <td className="border border-gray-300 px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-6 lg:py-4 text-xs sm:text-sm md:text-base">{official.official_type}</td>
                                    <td className="border border-gray-300 px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4 lg:px-6 lg:py-4 text-center">
                                        <div className="flex justify-center space-x-2 flex-wrap gap-2">
                                            <button
                                                onClick={() => handleEdit(official)}
                                                className="px-2 py-1 sm:px-3 sm:py-2 md:px-3 md:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center text-xs sm:text-sm"
                                            >
                                                <FaEdit className="mr-1" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(official)}
                                                className="px-2 py-1 sm:px-3 sm:py-2 md:px-3 md:py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center text-xs sm:text-sm"
                                            >
                                                <FaTrash className="mr-1" /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold">
                                    {modalMode === "create" && "Add New Official"}
                                    {modalMode === "edit" && "Edit Official"}
                                    {modalMode === "delete" && "Confirm Delete"}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            {modalMode === "create" && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Position</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.official_type && <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Image (PNG/JPEG)</label>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg"
                                                onChange={handleImageChange}
                                                className={`w-full p-2 border rounded ${errors.image ? "border-red-500" : ""} text-xs sm:text-sm`}
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
                                                    viewMode={1} // Ensures the crop box stays within the image
                                                    className="w-full"
                                                />
                                                {formData.croppedImage && (
                                                    <img
                                                        src={formData.image_preview}
                                                        alt="Cropped Preview"
                                                        className="mt-2 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover rounded mx-auto"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-2 flex-wrap gap-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaTimes className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaPlus className={modalMode === "edit" ? "hidden" : "mr-2"} />
                                            <FaEdit className={modalMode === "edit" ? "mr-2" : "hidden"} /> Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === "edit" && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Position</label>
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : ""} text-xs sm:text-sm md:text-base`}
                                                required
                                            />
                                            {errors.official_type && <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>}
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-2 flex-wrap gap-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaTimes className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaEdit className="mr-2" /> Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === "delete" && currentOfficial && (
                                <div className="space-y-4">
                                    <p className="text-xs sm:text-sm md:text-base">Are you sure you want to delete {currentOfficial.name}?</p>
                                    <div className="flex justify-end space-x-2 flex-wrap gap-2">
                                        <button
                                            onClick={closeModal}
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaTimes className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteConfirm}
                                            className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center text-xs sm:text-sm md:text-base"
                                        >
                                            <FaTrash className="mr-2" /> Delete
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