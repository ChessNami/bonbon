import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrash, FaTimes, FaArrowLeft, FaArrowRight, FaEye, FaClock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '../../../supabaseClient';
import Compressor from 'compressorjs';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import placeholderImage from '../../../img/Placeholder/placeholder.png';
import Loader from '../../Loader';

const SKOfficials = () => {
    const [officials, setOfficials] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [currentOfficial, setCurrentOfficial] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        position: "",
        official_type: "",
        image: null,
        image_preview: "",
        croppedImage: null,
        is_current: true,
        start_year: new Date().getFullYear(),
        end_year: null,
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isFormerModalOpen, setIsFormerModalOpen] = useState(false);
    const cropperRef = useRef(null);

    const leaderPosition = 'SK Chairman';

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
                .from('sk_officials')
                .select('*');

            if (error) throw error;

            const officialsWithSignedUrls = await Promise.all(
                (data || []).map(async (official) => {
                    if (official.image_url) {
                        const filePath = official.image_url.split('/skofficials/')[1] || `public/sk_official_${official.id}.jpg`;
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('skofficials')
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

            const sortedOfficials = officialsWithSignedUrls.sort((a, b) => {
                const getPositionPriority = (position) => {
                    const pos = position.toLowerCase();
                    if (
                        pos.includes("sk chairman") ||
                        pos.includes("chairman") ||
                        pos.includes("sk chairperson")
                    ) {
                        return 1;
                    }
                    if (pos.includes("secretary")) return 2;
                    if (pos.includes("treasurer")) return 3;
                    if (pos.includes("kagawad")) return 4;
                    return 5;
                };

                const priorityA = getPositionPriority(a.position);
                const priorityB = getPositionPriority(b.position);

                // 1. Sort by position priority
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // 2. Within same position: current officials first
                if (a.is_current && !b.is_current) return -1;
                if (!a.is_current && b.is_current) return 1;

                // 3. For former officials: newest end_year first
                if (!a.is_current && !b.is_current) {
                    return (b.end_year || 0) - (a.end_year || 0);
                }

                // 4. For current officials: newest start_year first
                if (a.is_current && b.is_current) {
                    return (b.start_year || 0) - (a.start_year || 0);
                }

                // 5. For Kagawads: sort alphabetically by last name
                if (priorityA === 4) {
                    const lastNameA = a.name.split(" ").slice(-1)[0].toLowerCase();
                    const lastNameB = b.name.split(" ").slice(-1)[0].toLowerCase();
                    return lastNameA.localeCompare(lastNameB);
                }

                return 0; // fallback (should rarely hit)
            });

            setOfficials(sortedOfficials);
        } catch (error) {
            console.error('Error fetching SK officials:', error);
            Swal.fire({
                icon: "error",
                title: "Fetch Error",
                text: "Failed to fetch SK officials. Check console for details.",
                scrollbarPadding: false,
            });
            setOfficials([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let parsedValue = value;
        if (name === 'is_current') {
            parsedValue = value === 'true';
        } else if (['start_year', 'end_year'].includes(name)) {
            parsedValue = value ? parseInt(value, 10) : null;
        }
        setFormData({ ...formData, [name]: parsedValue });
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
                scrollbarPadding: false,
            });
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required.";
        if (!formData.position.trim()) newErrors.position = "Position is required.";
        if (!formData.official_type.trim()) newErrors.official_type = "Official type is required.";
        if (!formData.image && modalMode === "create") newErrors.image = "Image is required for new officials.";
        if (!formData.start_year || formData.start_year < 1900 || formData.start_year > 2100) newErrors.start_year = "Valid start year (1900-2100) is required.";
        if (!formData.is_current && (!formData.end_year || formData.end_year < formData.start_year || formData.end_year > 2100)) {
            newErrors.end_year = "Valid end year (after start, up to 2100) required for former officials.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreate = () => {
        setModalMode("create");
        setFormData({
            name: "",
            position: "",
            official_type: "",
            image: null,
            image_preview: "",
            croppedImage: null,
            is_current: true,
            start_year: new Date().getFullYear(),
            end_year: null,
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
            is_current: official.is_current ?? true,
            start_year: official.start_year || new Date().getFullYear(),
            end_year: official.end_year || null,
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = (official) => {
        setModalMode("delete");
        setCurrentOfficial(official);
        setIsModalOpen(true);
    };

    const handleView = (official) => {
        setModalMode("view");
        setCurrentOfficial(official);
        setFormData({
            name: official.name,
            position: official.position,
            official_type: official.official_type,
            is_current: official.is_current ?? true,
            start_year: official.start_year || new Date().getFullYear(),
            end_year: official.end_year || null,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            Swal.fire({
                title: 'Processing...',
                text: `Please wait while we ${modalMode === "create" ? "add" : "update"} the SK official.`,
                scrollbarPadding: false,
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

                    const whiteBgCanvas = document.createElement('canvas');
                    whiteBgCanvas.width = 600;
                    whiteBgCanvas.height = 600;
                    const ctx = whiteBgCanvas.getContext('2d');

                    ctx.fillStyle = "#ffffff";
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

                    const { data: insertData, error: insertError } = await supabase
                        .from('sk_officials')
                        .insert([{
                            name: formData.name,
                            position: formData.position,
                            official_type: formData.official_type,
                            is_current: formData.is_current,
                            start_year: formData.start_year,
                            end_year: formData.is_current ? null : formData.end_year,
                        }])
                        .select('id');

                    if (insertError) throw new Error(`Error inserting SK official: ${insertError.message}`);

                    officialId = insertData[0].id;
                    const fileName = `public/sk_official_${officialId}.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('skofficials')
                        .upload(fileName, compressedImage, {
                            cacheControl: '3600',
                            upsert: true,
                        });

                    if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);

                    const { error: updateError } = await supabase
                        .from('sk_officials')
                        .update({ image_url: fileName })
                        .eq('id', officialId);

                    if (updateError) throw new Error(`Error updating image URL: ${updateError.message}`);
                }
            } else if (modalMode === "edit" && currentOfficial) {
                const { error: updateError } = await supabase
                    .from('sk_officials')
                    .update({
                        name: formData.name,
                        position: formData.position,
                        official_type: formData.official_type,
                        is_current: formData.is_current,
                        start_year: formData.start_year,
                        end_year: formData.is_current ? null : formData.end_year,
                    })
                    .eq('id', currentOfficial.id);

                if (updateError) throw new Error(`Error updating SK official: ${updateError.message}`);
            }

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: `SK Official ${modalMode === "create" ? "added" : "updated"} successfully`,
                showConfirmButton: false,
                scrollbarPadding: false,
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
                scrollbarPadding: false,
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (currentOfficial) {
            try {
                Swal.fire({
                    title: 'Processing...',
                    text: 'Please wait while we delete the SK official.',
                    scrollbarPadding: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                if (currentOfficial.image_url) {
                    const filePath = currentOfficial.image_url.split('/skofficials/')[1] || `public/sk_official_${currentOfficial.id}.jpg`;
                    await supabase.storage
                        .from('skofficials')
                        .remove([filePath]);
                }

                const { error } = await supabase
                    .from('sk_officials')
                    .delete()
                    .eq('id', currentOfficial.id);

                if (error) throw new Error(`Error deleting SK official: ${error.message}`);

                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "SK Official deleted successfully",
                    scrollbarPadding: false,
                    showConfirmButton: false,
                    timer: 1500,
                });

                await fetchOfficials();
            } catch (error) {
                Swal.close();
                console.error('Error deleting SK official:', error);
                Swal.fire({
                    icon: "error",
                    title: "Delete Failed",
                    text: error.message || "An unexpected error occurred. Please try again.",
                    scrollbarPadding: false,
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
            position: "",
            official_type: "",
            image: null,
            image_preview: "",
            croppedImage: null,
            is_current: true,
            start_year: new Date().getFullYear(),
            end_year: null,
        });
        setErrors({});
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Hide former SK Chairman from the main grid
    const filteredOfficials = officials.filter(official =>
        !(official.position === leaderPosition && !official.is_current)
    );

    const currentItems = filteredOfficials.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOfficials.length / itemsPerPage);

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
                <button
                    onClick={() => setIsFormerModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-md"
                >
                    <FaClock className="mr-2" /> Former SK Chairman
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
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                                variants={cardVariants}
                                onClick={() => handleView(official)}
                            >
                                <div className="relative w-full pt-[100%]">
                                    <img
                                        src={official.signedImageUrl || placeholderImage}
                                        alt={official.name}
                                        className="absolute top-0 left-0 w-full h-full object-cover"
                                        onError={(e) => { e.target.src = placeholderImage; }}
                                    />
                                    <div className={`absolute top-2 left-2 bg-${official.is_current ? 'green' : 'red'}-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow`}>
                                        {official.is_current ? 'CURRENT' : 'FORMER'}
                                    </div>
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(official); }}
                                            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(official); }}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleView(official); }}
                                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                                        >
                                            <FaEye size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-gray-800">{official.name}</h3>
                                    <p className="text-sm text-gray-600">{official.position}</p>
                                    <p className="text-xs text-gray-500">
                                        {official.start_year} - {official.is_current ? 'Present' : official.end_year || 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-500">{official.official_type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="flex justify-center items-center mt-8 space-x-4">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                            <FaArrowLeft size={16} />
                        </button>
                        <div className="flex space-x-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => paginate(page)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-full transition-all duration-200 ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
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
                        onClick={closeModal}
                    >
                        <motion.div
                            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {modalMode === "create" && "Add New Official"}
                                    {modalMode === "edit" && "Edit Official"}
                                    {modalMode === "delete" && "Confirm Delete"}
                                    {modalMode === "view" && "View Official"}
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
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Position</label>
                                            <select
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            >
                                                <option value="SK Chairman">SK Chairman</option>
                                                <option value="SK Secretary">SK Secretary</option>
                                                <option value="SK Treasurer">SK Treasurer</option>
                                                <option value="SK Kagawad">SK Kagawad</option>
                                            </select>
                                            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.official_type && <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Image (PNG/JPEG)</label>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg"
                                                onChange={handleImageChange}
                                                className={`w-full p-2 border rounded ${errors.image ? "border-red-500" : "border-gray-300"}`}
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

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Status</label>
                                            <select
                                                name="is_current"
                                                value={formData.is_current}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.is_current ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            >
                                                <option value={true}>Current</option>
                                                <option value={false}>Former</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Start Year</label>
                                            <input
                                                type="number"
                                                name="start_year"
                                                value={formData.start_year || ""}
                                                onChange={handleInputChange}
                                                min="1900"
                                                max="2100"
                                                className={`w-full p-2 border rounded ${errors.start_year ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.start_year && <p className="text-red-500 text-xs mt-1">{errors.start_year}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">End Year <span className="text-gray-500">(optional)</span></label>
                                            <input
                                                type="number"
                                                name="end_year"
                                                value={formData.end_year || ""}
                                                onChange={handleInputChange}
                                                min="1900"
                                                max="2100"
                                                placeholder={formData.is_current ? "Present" : ""}
                                                disabled={formData.is_current}
                                                className={`w-full p-2 border rounded ${errors.end_year ? "border-red-500" : "border-gray-300"} disabled:bg-gray-100`}
                                            />
                                            {errors.end_year && <p className="text-red-500 text-xs mt-1">{errors.end_year}</p>}
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
                                                className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Position</label>
                                            <select
                                                name="position"
                                                value={formData.position}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            >
                                                <option value="SK Chairman">SK Chairman</option>
                                                <option value="SK Secretary">SK Secretary</option>
                                                <option value="SK Treasurer">SK Treasurer</option>
                                                <option value="SK Kagawad">SK Kagawad</option>
                                            </select>
                                            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Official Type</label>
                                            <input
                                                type="text"
                                                name="official_type"
                                                value={formData.official_type}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.official_type ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.official_type && <p className="text-red-500 text-xs mt-1">{errors.official_type}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Status</label>
                                            <select
                                                name="is_current"
                                                value={formData.is_current}
                                                onChange={handleInputChange}
                                                className={`w-full p-2 border rounded ${errors.is_current ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                            >
                                                <option value={true}>Current</option>
                                                <option value={false}>Former</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Start Year</label>
                                            <input
                                                type="number"
                                                name="start_year"
                                                value={formData.start_year || ""}
                                                onChange={handleInputChange}
                                                min="1900"
                                                max="2100"
                                                className={`w-full p-2 border rounded ${errors.start_year ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                            {errors.start_year && <p className="text-red-500 text-xs mt-1">{errors.start_year}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">End Year <span className="text-gray-500">(optional)</span></label>
                                            <input
                                                type="number"
                                                name="end_year"
                                                value={formData.end_year || ""}
                                                onChange={handleInputChange}
                                                min="1900"
                                                max="2100"
                                                placeholder={formData.is_current ? "Present" : ""}
                                                disabled={formData.is_current}
                                                className={`w-full p-2 border rounded ${errors.end_year ? "border-red-500" : "border-gray-300"} disabled:bg-gray-100`}
                                            />
                                            {errors.end_year && <p className="text-red-500 text-xs mt-1">{errors.end_year}</p>}
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

                            {modalMode === "view" && currentOfficial && (
                                <div className="space-y-6">
                                    {/* Content */}
                                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                        {/* Profile Photo */}
                                        <div className="flex-shrink-0">
                                            {currentOfficial.signedImageUrl ? (
                                                <div className="relative">
                                                    {/* Shimmer placeholder */}
                                                    <div className="w-48 h-48 bg-gray-200 rounded-full animate-pulse" />

                                                    {/* Real image with smooth fade-in */}
                                                    <img
                                                        src={currentOfficial.signedImageUrl}
                                                        alt={currentOfficial.name}
                                                        onLoad={(e) => e.target.style.opacity = '1'}
                                                        onError={(e) => { e.target.src = placeholderImage; }}
                                                        className="absolute inset-0 w-full h-full object-cover rounded-full border-4 border-white shadow-xl"
                                                        style={{ opacity: 0, transition: 'opacity 0.5s' }}
                                                        layoutId={`official-${currentOfficial.id}`} // Keep smooth transition from former modal
                                                    />
                                                </div>
                                            ) : (
                                                <img
                                                    src={placeholderImage}
                                                    alt={currentOfficial.name}
                                                    className="w-48 h-48 object-cover rounded-full border-4 border-white shadow-xl"
                                                    layoutId={`official-${currentOfficial.id}`}
                                                />
                                            )}

                                            {/* Status Badge */}
                                            <div className={`mt-4 px-6 py-2 rounded-full text-white font-bold text-lg shadow-lg mx-auto w-fit
          ${currentOfficial.is_current ? 'bg-green-600' : 'bg-red-600'}`}
                                            >
                                                {currentOfficial.is_current ? 'CURRENT' : 'FORMER'}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 space-y-5 text-left max-w-lg">
                                            <div>
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Full Name</label>
                                                <p className="text-2xl font-bold text-gray-800 mt-1">{currentOfficial.name}</p>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Position</label>
                                                <p className="text-xl text-gray-700 mt-1">{currentOfficial.position}</p>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Official Type</label>
                                                <p className="text-lg text-gray-700 mt-1">{currentOfficial.official_type || '—'}</p>
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Term in Office</label>
                                                <p className="text-xl font-bold text-blue-600 mt-2">
                                                    {currentOfficial.start_year || '—'}
                                                    <span className="mx-2">→</span>
                                                    {currentOfficial.is_current
                                                        ? <span className="text-green-600">Present</span>
                                                        : <span className="text-red-600">{currentOfficial.end_year || 'N/A'}</span>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Close Button */}
                                    <div className="flex justify-center pt-6">
                                        <button
                                            onClick={closeModal}
                                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-lg rounded-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition shadow-lg"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {isFormerModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsFormerModalOpen(false)} // Close when clicking backdrop
                    >
                        <motion.div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center z-10">
                                <h2 className="text-3xl font-bold text-gray-800">Former SK Chairman</h2>
                                <button
                                    onClick={() => setIsFormerModalOpen(false)}
                                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition transform hover:scale-110"
                                >
                                    <FaTimes size={24} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                {(() => {
                                    const formerLeaders = officials
                                        .filter(o => o.position === leaderPosition && !o.is_current)
                                        .sort((a, b) => (b.end_year || 0) - (a.end_year || 0));

                                    if (formerLeaders.length === 0) {
                                        return (
                                            <div className="text-center py-20">
                                                <p className="text-xl text-gray-500">No former SK Chairmans.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <motion.div
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ staggerChildren: 0.1 }}
                                        >
                                            {formerLeaders.map((official) => (
                                                <motion.div
                                                    key={official.id}
                                                    layoutId={`official-${official.id}`} // This creates the SMOOTH transition!
                                                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100"
                                                    whileHover={{ y: -8 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
                                                        {/* Shimmer placeholder */}
                                                        <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-t-2xl" />

                                                        {/* Real image with smooth fade */}
                                                        <img
                                                            src={official.signedImageUrl || placeholderImage}
                                                            alt={official.name}
                                                            className="absolute inset-0 w-full h-full object-cover rounded-t-2xl transition-opacity duration-700"
                                                            onLoad={(e) => e.target.style.opacity = '1'}
                                                            style={{ opacity: 0 }}
                                                        />

                                                        {/* FORMER Badge */}
                                                        <div className="absolute top-4 left-4 bg-red-600 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm">
                                                            FORMER
                                                        </div>

                                                        {/* Edit/Delete/View Buttons */}
                                                        <div className="absolute top-4 right-4 flex space-x-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsFormerModalOpen(false);
                                                                    handleEdit(official);
                                                                }}
                                                                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow-md"
                                                            >
                                                                <FaEdit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsFormerModalOpen(false);
                                                                    handleDelete(official);
                                                                }}
                                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-md"
                                                            >
                                                                <FaTrash size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsFormerModalOpen(false);
                                                                    handleView(official);
                                                                }}
                                                                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-md"
                                                            >
                                                                <FaEye size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">
                                                            {official.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mt-1">{official.position}</p>
                                                        <p className="text-xs text-gray-500 mt-3 font-medium">
                                                            Term: {official.start_year} – {official.end_year || 'Present'}
                                                        </p>
                                                        {official.official_type && (
                                                            <p className="text-xs text-gray-500 mt-1 italic">{official.official_type}</p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SKOfficials;