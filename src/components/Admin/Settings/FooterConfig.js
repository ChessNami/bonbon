import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabaseClient";
import Loader from "../../Loader";
import { FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const socialMediaOptions = [
    { name: "Facebook", imgUrl: "https://cdn-icons-png.flaticon.com/512/733/733547.png" },
    { name: "X", imgUrl: "https://cdn-icons-png.flaticon.com/512/5969/5969020.png" },
    { name: "Instagram", imgUrl: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png" },
];

const FooterConfig = ({ onFetchResidents }) => {
    const [footerData, setFooterData] = useState({
        left_info: { address: "", telephone: "", email: "" },
        center_info: [{ imgUrl: "", name: "", link: "" }],
        right_info: [],
        logosize: 16,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [emailError, setEmailError] = useState("");

    const fetchFooterData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("footer_config")
                .select("*")
                .single();

            if (error) {
                console.error("Error fetching footer data:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to fetch footer data: " + error.message,
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            } else {
                setFooterData(data || {
                    left_info: { address: "", telephone: "", email: "" },
                    center_info: [{ imgUrl: "", name: "", link: "" }],
                    right_info: [],
                    logosize: 16,
                });
            }
            await onFetchResidents();
        } catch (error) {
            console.error("Unexpected error:", error);
            Swal.fire({
                icon: "error",
                title: "Unexpected Error",
                text: "An unexpected error occurred while fetching data.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, [onFetchResidents]);

    useEffect(() => {
        fetchFooterData();
    }, [fetchFooterData]);

    const handleInputChange = (section, field, value) => {
        if (section === "left_info" && field === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            setFooterData((prev) => ({
                ...prev,
                [section]: { ...prev[section], [field]: value },
            }));
            if (!value) {
                setEmailError("Email is required");
            } else if (!emailRegex.test(value)) {
                setEmailError("Please enter a valid email address");
            } else {
                setEmailError("");
            }
        } else {
            setFooterData((prev) => ({
                ...prev,
                [section]: { ...prev[section], [field]: value },
            }));
        }
    };

    const handleLogoSizeChange = (value) => {
        setFooterData((prev) => ({
            ...prev,
            logosize: parseInt(value, 10) || 16,
        }));
    };

    const addSocialLink = () => {
        setFooterData((prev) => ({
            ...prev,
            center_info: [...prev.center_info, { imgUrl: "", name: "", link: "" }],
        }));
    };

    const updateSocialInfo = (index, field, value) => {
        const updatedCenterInfo = [...footerData.center_info];
        if (field === "imgUrl") {
            const selectedOption = socialMediaOptions.find(option => option.imgUrl === value);
            updatedCenterInfo[index].imgUrl = value;
            updatedCenterInfo[index].name = selectedOption ? selectedOption.name : updatedCenterInfo[index].name;
        } else {
            updatedCenterInfo[index][field] = value;
        }
        setFooterData({ ...footerData, center_info: updatedCenterInfo });
    };

    const removeSocialLink = (index) => {
        setFooterData((prev) => ({
            ...prev,
            center_info: prev.center_info.filter((_, i) => i !== index),
        }));
    };

    const saveSettings = async () => {
        if (emailError) {
            Swal.fire({
                icon: "error",
                title: "Validation Error",
                text: "Please correct the email address before saving.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
            return;
        }

        Swal.fire({
            title: "Saving...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const { error } = await supabase
                .from("footer_config")
                .upsert(
                    {
                        id: 1,
                        left_info: footerData.left_info,
                        center_info: footerData.center_info,
                        right_info: footerData.right_info,
                        logosize: footerData.logosize,
                    },
                    { onConflict: "id" }
                );

            Swal.close();

            if (error) {
                console.error("Error saving settings:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to save settings: " + error.message,
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "Settings saved successfully!",
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            Swal.close();
            Swal.fire({
                icon: "error",
                title: "Unexpected Error",
                text: "An unexpected error occurred while saving settings.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
        }
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="p-4"
        >
            <section id="footer-settings" className="bg-white rounded-xl shadow-2xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-4">Footer Configuration</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Contact Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your address"
                                        value={footerData.left_info.address}
                                        onChange={(e) => handleInputChange("left_info", "address", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Telephone</label>
                                    <input
                                        type="text"
                                        placeholder="Enter telephone number"
                                        value={footerData.left_info.telephone}
                                        onChange={(e) => handleInputChange("left_info", "telephone", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={footerData.left_info.email}
                                        onChange={(e) => handleInputChange("left_info", "email", e.target.value)}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailError ? "border-red-500" : "border-gray-300"}`}
                                    />
                                    {emailError && (
                                        <p className="text-red-500 text-sm mt-1">{emailError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Social Media Links</h3>
                            {footerData.center_info.map((social, index) => (
                                <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex items-center gap-2 w-full sm:w-[180px]">
                                        {social.imgUrl && (
                                            <img
                                                src={social.imgUrl}
                                                alt={social.name || "Social Icon"}
                                                className="w-5 h-5 flex-shrink-0"
                                            />
                                        )}
                                        <select
                                            value={social.imgUrl}
                                            onChange={(e) => updateSocialInfo(index, "imgUrl", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                        >
                                            <option value="">Select Platform</option>
                                            {socialMediaOptions.map((option) => (
                                                <option key={option.imgUrl} value={option.imgUrl}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={social.name}
                                        onChange={(e) => updateSocialInfo(index, "name", e.target.value)}
                                        className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Link"
                                        value={social.link}
                                        onChange={(e) => updateSocialInfo(index, "link", e.target.value)}
                                        className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                    />
                                    <button
                                        onClick={() => removeSocialLink(index)}
                                        className="text-red-500 p-2 hover:text-red-700 transition-colors"
                                        title="Remove"
                                    >
                                        <FaTrash size={20} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addSocialLink}
                                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                            >
                                + Add New Social Link
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">Logo Settings</h3>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-600">Logo Size</label>
                            <input
                                type="number"
                                placeholder="Logo Size (px)"
                                value={footerData.logosize}
                                onChange={(e) => handleLogoSizeChange(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="1"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[0, 1].map((pos) => {
                                    const inputId = `logo-upload-${pos}`;
                                    return (
                                        <div key={pos} className="space-y-4">
                                            <label
                                                htmlFor={inputId}
                                                className="block text-sm font-medium text-gray-600"
                                            >
                                                Upload Logo {pos + 1}
                                            </label>
                                            <input
                                                id={inputId}
                                                type="file"
                                                accept="image/png"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const newRightInfo = [...footerData.right_info];
                                                            newRightInfo[pos] = { imgUrl: reader.result };
                                                            setFooterData({ ...footerData, right_info: newRightInfo });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full"
                                            />
                                            {footerData.right_info[pos]?.imgUrl ? (
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={footerData.right_info[pos].imgUrl}
                                                        alt={`Logo ${pos + 1}`}
                                                        className={`h-${footerData.logosize} w-${footerData.logosize} object-contain`}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newRightInfo = [...footerData.right_info];
                                                            newRightInfo[pos] = null;
                                                            setFooterData({ ...footerData, right_info: newRightInfo });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <FaTrash size={20} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-gray-400">No logo uploaded</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <motion.button
                        onClick={saveSettings}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md"
                        whileHover={{ scale: 1.05, backgroundColor: "#2563eb", transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                    >
                        Save All Settings
                    </motion.button>
                </div>
            </section>
            <div className="my-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Footer Preview</h3>
                <footer className="bg-gray-800 text-white p-4 rounded">
                    <div className="container mx-auto">
                        <div className="flex flex-col items-center space-y-6 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-4">
                            <div className="w-full text-center sm:w-1/3 sm:text-left">
                                <h3 className="font-semibold text-lg sm:text-xl mb-2">Contact Information</h3>
                                <address className="text-sm sm:text-md space-y-2 not-italic">
                                    {footerData.left_info.address ? (
                                        <p>{footerData.left_info.address}</p>
                                    ) : (
                                        <p className="text-gray-400">No address provided</p>
                                    )}
                                    {footerData.left_info.telephone ? (
                                        <p>Telephone: {footerData.left_info.telephone}</p>
                                    ) : (
                                        <p className="text-gray-400">No telephone provided</p>
                                    )}
                                    {footerData.left_info.email ? (
                                        <p>Email: {footerData.left_info.email}</p>
                                    ) : (
                                        <p className="text-gray-400">No email provided</p>
                                    )}
                                </address>
                            </div>
                            <div className="w-full flex justify-center sm:w-1/3">
                                <div className="flex flex-wrap gap-4 justify-center">
                                    {footerData.center_info.length > 0 ? (
                                        footerData.center_info.map((social, index) => (
                                            <a
                                                key={index}
                                                href={social.link || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-2"
                                            >
                                                {social.imgUrl ? (
                                                    <img src={social.imgUrl} alt={social.name} className="w-8 h-8" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                                                )}
                                                <span className="text-sm sm:text-md">{social.name || "Social Name"}</span>
                                            </a>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-sm sm:text-md">No social media links provided</p>
                                    )}
                                </div>
                            </div>
                            <div className="w-full flex justify-center sm:w-1/3 sm:justify-end">
                                <div className="flex flex-wrap gap-4 justify-center items-center">
                                    {footerData.right_info.some(logo => logo?.imgUrl) ? (
                                        footerData.right_info.map((logo, index) =>
                                            logo?.imgUrl ? (
                                                <img
                                                    key={index}
                                                    src={logo.imgUrl}
                                                    alt={`Logo ${index + 1}`}
                                                    className={`h-${footerData.logosize} w-${footerData.logosize} object-contain`}
                                                />
                                            ) : null
                                        )
                                    ) : (
                                        <p className="text-gray-400 text-sm sm:text-md">No logos provided</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </motion.div>
    );
};

export default FooterConfig;