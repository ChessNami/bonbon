import React, { useState } from "react";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa"; // React Icons
import { motion, AnimatePresence } from "framer-motion"; // Framer Motion

const BarangayOfficials = () => {
    // Initial state for officials
    const [officials, setOfficials] = useState([
        {
            id: 1,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "John Doe",
            position: "Chairman",
            officialType: "Elected",
        },
        {
            id: 2,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "Jane Smith",
            position: "Secretary",
            officialType: "Appointed",
        },
        {
            id: 3,
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            name: "Mark Johnson",
            position: "Treasurer",
            officialType: "Elected",
        },
    ]);

    // State for modal and form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // 'create', 'edit', 'delete'
    const [currentOfficial, setCurrentOfficial] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        position: "Kagawad", // Default to "Kagawad"
        officialType: "", // Empty by default, user will input
        image: null, // For file input
        imagePreview: "", // For displaying preview
    });

    // State for errors
    const [errors, setErrors] = useState({});

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: "" }); // Clear error when user types
    };

    // Handle image upload
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
            setFormData({
                ...formData,
                image: file,
                imagePreview: URL.createObjectURL(file),
            });
            setErrors({ ...errors, image: "" });
        } else {
            setErrors({ ...errors, image: "Please upload a PNG or JPEG/JPG file." });
        }
    };

    // Validate form
    const validateForm = () => {
        let newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required.";
        if (!formData.position.trim()) newErrors.position = "Position is required.";
        if (!formData.officialType.trim()) newErrors.officialType = "Official type is required.";
        if (!formData.image && modalMode === "create") newErrors.image = "Image is required for new officials.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Open modal for create
    const handleCreate = () => {
        setModalMode("create");
        setFormData({
            name: "",
            position: "Kagawad",
            officialType: "",
            image: null,
            imagePreview: "",
        });
        setErrors({});
        setIsModalOpen(true);
    };

    // Open modal for edit
    const handleEdit = (official) => {
        setModalMode("edit");
        setCurrentOfficial(official);
        setFormData({
            name: official.name,
            position: official.position,
            officialType: official.officialType,
            image: null,
            imagePreview: official.image,
        });
        setErrors({});
        setIsModalOpen(true);
    };

    // Open modal for delete
    const handleDelete = (official) => {
        setModalMode("delete");
        setCurrentOfficial(official);
        setIsModalOpen(true);
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (modalMode === "create") {
            const newOfficial = {
                id: officials.length + 1,
                name: formData.name,
                position: formData.position,
                officialType: formData.officialType,
                image: formData.image ? URL.createObjectURL(formData.image) : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqAOWChqSvBGSSxblhoEotb7dk15TT5Q0Fog&s",
            };
            setOfficials([...officials, newOfficial]);
            Swal.fire({
                icon: "success",
                title: "Success!",
                text: "Official added successfully.",
                timer: 1500, // 1.5 seconds
                showConfirmButton: false,
            });
        } else if (modalMode === "edit" && currentOfficial) {
            const updatedOfficials = officials.map((official) =>
                official.id === currentOfficial.id
                    ? {
                        ...official,
                        name: formData.name,
                        position: formData.position,
                        officialType: formData.officialType,
                        image: formData.image ? URL.createObjectURL(formData.image) : official.image,
                    }
                    : official
            );
            setOfficials(updatedOfficials);
            Swal.fire({
                icon: "success",
                title: "Success!",
                text: "Official updated successfully.",
                timer: 1500,
                showConfirmButton: false,
            });
        }
        setIsModalOpen(false);
    };

    // Handle delete confirmation
    const handleDeleteConfirm = () => {
        if (currentOfficial) {
            setOfficials(officials.filter((official) => official.id !== currentOfficial.id));
            Swal.fire({
                icon: "success",
                title: "Deleted!",
                text: "Official deleted successfully.",
                timer: 1500,
                showConfirmButton: false,
            });
        }
        setIsModalOpen(false);
    };

    // Close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentOfficial(null);
        setFormData({
            name: "",
            position: "Kagawad",
            officialType: "",
            image: null,
            imagePreview: "",
        });
        setErrors({});
    };

    // Animation variants for modal
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.8 },
    };

    return (
        <div className="p-4 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Barangay Officials</h1>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                >
                    <FaPlus className="mr-2" /> Add Official
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Position</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Official Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {officials.map((official) => (
                            <tr key={official.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">
                                    <div className="flex items-center">
                                        <img
                                            src={official.image}
                                            alt={official.name}
                                            className="w-24 h-24 rounded object-cover mr-4"
                                        />
                                        <span>{official.name}</span>
                                    </div>
                                </td>
                                <td className="border border-gray-300 px-4 py-2">{official.position}</td>
                                <td className="border border-gray-300 px-4 py-2">{official.officialType}</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    <div className="flex justify-center space-x-2">
                                        <button
                                            onClick={() => handleEdit(official)}
                                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                                        >
                                            <FaEdit className="mr-1" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(official)}
                                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                                        >
                                            <FaTrash className="mr-1" /> Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal with Animation */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">
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

                            {(modalMode === "create" || modalMode === "edit") && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className={`w-full p-2 border rounded ${errors.name ? "border-red-500" : ""}`}
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
                                            className={`w-full p-2 border rounded ${errors.position ? "border-red-500" : ""}`}
                                            required
                                        />
                                        {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Official Type</label>
                                        <input
                                            type="text"
                                            name="officialType"
                                            value={formData.officialType}
                                            onChange={handleInputChange}
                                            className={`w-full p-2 border rounded ${errors.officialType ? "border-red-500" : ""}`}
                                            required
                                        />
                                        {errors.officialType && <p className="text-red-500 text-xs mt-1">{errors.officialType}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Image (PNG/JPEG)</label>
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            onChange={handleImageChange}
                                            className={`w-full p-2 border rounded ${errors.image ? "border-red-500" : ""}`}
                                        />
                                        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                                        {formData.imagePreview && (
                                            <img
                                                src={formData.imagePreview}
                                                alt="Preview"
                                                className="mt-2 w-32 h-32 object-cover rounded"
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
                                        >
                                            <FaTimes className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                                        >
                                            <FaPlus className={modalMode === "edit" ? "hidden" : "mr-2"} />
                                            <FaEdit className={modalMode === "edit" ? "mr-2" : "hidden"} /> Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === "delete" && currentOfficial && (
                                <div className="space-y-4">
                                    <p>Are you sure you want to delete {currentOfficial.name}?</p>
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={closeModal}
                                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
                                        >
                                            <FaTimes className="mr-2" /> Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteConfirm}
                                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
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