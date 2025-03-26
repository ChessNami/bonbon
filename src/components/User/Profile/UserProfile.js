import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import placeholderImg from "../../../img/Placeholder/placeholder.png";
import coverPhotoPlaceholder from "../../../img/Placeholder/coverphoto.png";
import Compressor from "compressorjs";
import { FaCamera, FaEye, FaEdit } from "react-icons/fa";

const UserProfile = ({ activeTab, setActiveTab, onLoadingComplete }) => {
    const [user, setUser] = useState(null);
    const [profilePic, setProfilePic] = useState(placeholderImg);
    const [coverPhoto, setCoverPhoto] = useState(coverPhotoPlaceholder);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCoverDropdown, setShowCoverDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(false);
    const [modalImage, setModalImage] = useState("");
    const dropdownRef = useRef(null);
    const coverDropdownRef = useRef(null);
    const coverDropdownButtonRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user) {
                console.error("Error fetching user:", error?.message || "No user found");
                onLoadingComplete(false); // Notify parent that loading failed
                return;
            }

            const userData = data.user;
            setUser(userData);
            setProfilePic(userData.user_metadata?.profilePic || placeholderImg);
            setCoverPhoto(userData.user_metadata?.coverPhoto || coverPhotoPlaceholder);

            onLoadingComplete(true); // Notify parent that loading is complete
        };

        fetchUser();
    }, [onLoadingComplete]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }

            if (
                coverDropdownRef.current &&
                !coverDropdownRef.current.contains(event.target) &&
                coverDropdownButtonRef.current &&
                !coverDropdownButtonRef.current.contains(event.target)
            ) {
                setShowCoverDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        new Compressor(file, {
            quality: 0.8,
            success: async (compressedFile) => {
                const fileExt = compressedFile.name.split(".").pop();
                const filePath = `${user.id}/${type}.${fileExt}`;

                const { error } = await supabase.storage
                    .from("user-assets")
                    .upload(filePath, compressedFile, { upsert: true });

                if (error) {
                    Swal.fire({
                        icon: "error",
                        title: "Upload Failed",
                        text: error.message,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from("user-assets")
                    .getPublicUrl(filePath);

                if (publicUrlData) {
                    const url = publicUrlData.publicUrl;

                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { [type]: url },
                    });

                    if (updateError) {
                        Swal.fire({
                            icon: "error",
                            title: "Update Failed",
                            text: updateError.message,
                            timer: 2000,
                            showConfirmButton: false,
                        });
                        return;
                    }

                    if (type === "profilePic") setProfilePic(url);
                    else setCoverPhoto(url);

                    Swal.fire({
                        icon: "success",
                        title: "Upload Successful",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                }

                setShowDropdown(false);
                setShowCoverDropdown(false);
            },
            error(err) {
                Swal.fire({
                    icon: "error",
                    title: "Compression Failed",
                    text: err.message,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleViewImage = (image, type) => {
        setModalImage(image);
        setShowModal(true);
        setModalType(type);
    };

    return (
        <div className="select-none">
            {/* Cover Photo Section */}
            <div className="relative h-48 sm:h-72 bg-gray-300">
                {coverPhoto && (
                    <img
                        src={coverPhoto}
                        alt="Cover"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => handleViewImage(coverPhoto)}
                    />
                )}
                <div className="absolute bottom-4 right-4">
                    <button
                        ref={coverDropdownButtonRef}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                        onClick={() => setShowCoverDropdown(!showCoverDropdown)}
                    >
                        <FaEdit className="mr-2" /> Edit
                    </button>
                    {showCoverDropdown && (
                        <div
                            ref={coverDropdownRef}
                            className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg z-20"
                        >
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                                onClick={() => {
                                    document.getElementById("coverPhotoInput").click();
                                    setShowCoverDropdown(false);
                                }}
                            >
                                <FaCamera className="mr-2" /> Upload New Cover Photo
                            </button>
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                                onClick={() => {
                                    handleViewImage(coverPhoto);
                                    setShowCoverDropdown(false);
                                }}
                            >
                                <FaEye className="mr-2" /> View Cover Photo
                            </button>
                        </div>
                    )}
                    <input
                        id="coverPhotoInput"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "coverPhoto")}
                    />
                </div>
            </div>

            {/* Profile Picture and User Info */}
            <div className="flex flex-col sm:flex-row items-center p-4 relative">
                <div className="relative w-24 h-24 sm:w-36 sm:h-36" ref={dropdownRef}>
                    <img
                        src={profilePic}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover cursor-pointer border-4 border-gray-200 shadow-lg"
                        onClick={() => setShowDropdown(!showDropdown)}
                    />
                    {showDropdown && (
                        <div className="absolute left-0 mt-2 w-72 bg-white border rounded shadow-lg z-20">
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                                onClick={() => {
                                    document.getElementById("profilePicInput").click();
                                    setShowDropdown(false);
                                }}
                            >
                                <FaCamera className="mr-2" /> Upload New Profile Picture
                            </button>
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                                onClick={() => {
                                    handleViewImage(profilePic);
                                    setShowDropdown(false);
                                }}
                            >
                                <FaEye className="mr-2" /> View Profile Picture
                            </button>
                        </div>
                    )}
                    <input
                        id="profilePicInput"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "profilePic")}
                    />
                </div>

                <div className="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                        {user?.user_metadata?.display_name || "User"}
                    </h2>
                    <p className="text-gray-400">{user?.email || "No email available"}</p>
                </div>
            </div>

            {/* Modal for Viewing Images */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <img
                            src={modalImage}
                            alt="Full View"
                            className={`object-cover mx-auto ${modalType === "profile"
                                    ? "w-64 h-64 rounded-full"
                                    : "w-full h-auto max-h-[500px]"
                                }`}
                        />
                        <button
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded w-full"
                            onClick={() => setShowModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b bg-gray-100 flex flex-wrap justify-center sm:justify-start">
                {[
                    { key: "myAccount", label: "My Account" },
                    { key: "accountSettings", label: "Account Settings" },
                    { key: "residentProfiling", label: "Resident Profiling" },
                    { key: "help", label: "Help" },
                ].map((tab) => (
                    <div
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`cursor-pointer px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.key
                                ? "border-b-2 border-blue-700 text-blue-700"
                                : "text-gray-600 hover:text-blue-700"
                            }`}
                    >
                        {tab.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserProfile;