import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import placeholderImg from "../../../img/Placeholder/placeholder.png";
import coverPhotoPlaceholder from "../../../img/Placeholder/coverphoto.png";
import Compressor from "compressorjs";
import { FaCamera, FaEye, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import Loader from "../../Loader";

const UserProfile = ({ activeTab, setActiveTab, onLoadingComplete }) => {
    const [user, setUser] = useState(null);
    const [profilePic, setProfilePic] = useState(placeholderImg);
    const [coverPhoto, setCoverPhoto] = useState(coverPhotoPlaceholder);
    const [profilePicLoading, setProfilePicLoading] = useState(true);
    const [coverPhotoLoading, setCoverPhotoLoading] = useState(true);
    const [residentProfileStatus, setResidentProfileStatus] = useState(null);
    const [userRoleId, setUserRoleId] = useState(null); // New state for user role
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCoverDropdown, setShowCoverDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(false);
    const [modalImage, setModalImage] = useState("");
    const dropdownRef = useRef(null);
    const coverDropdownRef = useRef(null);
    const coverDropdownButtonRef = useRef(null);

    useEffect(() => {
        const fetchUserAndStatus = async () => {
            const { data: authData, error: authError } = await supabase.auth.getUser();

            if (authError || !authData?.user) {
                console.error("Error fetching user:", authError?.message || "No user found");
                setProfilePicLoading(false);
                setCoverPhotoLoading(false);
                onLoadingComplete(false);
                return;
            }

            const userData = authData.user;
            setUser(userData);

            // Fetch user's role
            const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", userData.id)
                .single();

            if (roleError || !roleData) {
                console.error("Error fetching user role:", roleError?.message);
                setUserRoleId(null); // Default to no role if error
            } else {
                setUserRoleId(roleData.role_id);
            }

            // Fetch Resident Profile Status
            const { data: residentData, error: residentError } = await supabase
                .from("residents")
                .select("id")
                .eq("user_id", userData.id)
                .single();

            if (residentError || !residentData) {
                console.error("Error fetching resident data:", residentError?.message);
                setResidentProfileStatus(null);
            } else {
                const { data: statusData, error: statusError } = await supabase
                    .from("resident_profile_status")
                    .select("status")
                    .eq("resident_id", residentData.id)
                    .single();

                if (statusError || !statusData) {
                    console.error("Error fetching resident profile status:", statusError?.message);
                    setResidentProfileStatus(null);
                } else {
                    setResidentProfileStatus(statusData.status);
                }
            }

            const profilePicPath = userData.user_metadata?.profilePic?.split("/").slice(-2).join("/");
            const coverPhotoPath = userData.user_metadata?.coverPhoto?.split("/").slice(-2).join("/");

            try {
                if (profilePicPath) {
                    const { data: signedProfilePic, error: profilePicError } = await supabase.storage
                        .from("user-assets")
                        .createSignedUrl(profilePicPath, 3600);

                    if (profilePicError) {
                        console.error("Error generating signed URL for profile picture:", profilePicError.message);
                    } else {
                        setProfilePic(signedProfilePic.signedUrl);
                    }
                }

                if (coverPhotoPath) {
                    const { data: signedCoverPhoto, error: coverPhotoError } = await supabase.storage
                        .from("user-assets")
                        .createSignedUrl(coverPhotoPath, 3600);

                    if (coverPhotoError) {
                        console.error("Error generating signed URL for cover photo:", coverPhotoError.message);
                    } else {
                        setCoverPhoto(signedCoverPhoto.signedUrl);
                    }
                }
            } catch (err) {
                console.error("Error generating signed URLs:", err.message);
            } finally {
                setProfilePicLoading(false);
                setCoverPhotoLoading(false);
                onLoadingComplete(true);
            }
        };

        fetchUserAndStatus();
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
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Authentication Error",
                text: "You must be logged in to upload a photo.",
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        if (!file) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "No File Selected",
                text: "Please select a file to upload.",
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid File Type",
                text: "Only JPEG, JPG, and PNG files are allowed.",
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        Swal.fire({
            title: "Uploading...",
            text: "Please wait while your photo is being uploaded.",
            allowOutsideClick: false,
            scrollbarPadding: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        if (type === "profilePic") setProfilePicLoading(true);
        if (type === "coverPhoto") setCoverPhotoLoading(true);

        new Compressor(file, {
            quality: 0.8,
            success: async (compressedFile) => {
                const fileExt = compressedFile.name.split(".").pop();
                const fileName = `${userData.user.id}/${type}.${fileExt}`;

                try {
                    const { error: uploadError } = await supabase.storage
                        .from("user-assets")
                        .upload(fileName, compressedFile, { upsert: true });

                    if (uploadError) {
                        throw uploadError;
                    }

                    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                        .from("user-assets")
                        .createSignedUrl(fileName, 3600);

                    if (signedUrlError) {
                        throw signedUrlError;
                    }

                    const signedUrl = signedUrlData.signedUrl;

                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { [type]: fileName },
                    });

                    if (updateError) {
                        throw updateError;
                    }

                    if (type === "profilePic") {
                        setProfilePic(signedUrl);
                    } else {
                        setCoverPhoto(signedUrl);
                    }

                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: "Upload Successful",
                        text: "Your photo has been uploaded successfully.",
                        timer: 1500,
                        showConfirmButton: false,
                        scrollbarPadding: false,
                    });
                } catch (error) {
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "error",
                        title: "Upload Failed",
                        text: error.message,
                        timer: 1500,
                        showConfirmButton: false,
                        scrollbarPadding: false,
                    });
                } finally {
                    if (type === "profilePic") setProfilePicLoading(false);
                    if (type === "coverPhoto") setCoverPhotoLoading(false);
                }
            },
            error(err) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Compression Failed",
                    text: err.message,
                    timer: 1500,
                    showConfirmButton: false,
                    scrollbarPadding: false,
                });
                if (type === "profilePic") setProfilePicLoading(false);
                if (type === "coverPhoto") setCoverPhotoLoading(false);
            },
        });
    };

    const handleDeletePhoto = async (type) => {
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "User is not authenticated.",
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        const currentPhotoUrl = type === "profilePic" ? profilePic : coverPhoto;

        if (!currentPhotoUrl || currentPhotoUrl === placeholderImg || currentPhotoUrl === coverPhotoPlaceholder) {
            Swal.fire({
                icon: "info",
                title: "No Photo to Delete",
                text: `There is no ${type === "profilePic" ? "profile" : "cover"} photo to delete.`,
                timer: 2000,
                showConfirmButton: false,
            });
            return;
        }

        const filePath = currentPhotoUrl.split("/").slice(-2).join("/");

        try {
            const { error: deleteError } = await supabase.storage
                .from("user-assets")
                .remove([filePath]);

            if (deleteError) {
                throw deleteError;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                data: { [type]: null },
            });

            if (updateError) {
                throw updateError;
            }

            if (type === "profilePic") setProfilePic(placeholderImg);
            else setCoverPhoto(coverPhotoPlaceholder);

            Swal.fire({
                icon: "success",
                title: "Photo Deleted",
                text: `${type === "profilePic" ? "Profile" : "Cover"} photo has been deleted.`,
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Delete Failed",
                text: error.message,
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    const handleViewImage = (image, type) => {
        setModalImage(image);
        setShowModal(true);
        setModalType(type);
    };

    const handleTabClick = async (tabKey) => {
        if (tabKey === "residentProfiling" && userRoleId !== 1) { // Only show for non-admins
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "Do you want to proceed to Resident Profiling?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, proceed",
                cancelButtonText: "No, cancel",
            });

            if (result.isConfirmed) {
                Swal.fire({
                    title: "Redirecting...",
                    text: "Please wait",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 1000));
                Swal.close();
                setActiveTab(tabKey);
            } else {
                setActiveTab("myAccount");
            }
        } else {
            setActiveTab(tabKey);
        }
    };

    const tabs = [
        { key: "myAccount", label: "My Account" },
        { key: "accountSettings", label: "Account Settings" },
        ...(userRoleId !== 1 ? [{ key: "residentProfiling", label: "Resident Profiling" }] : []), // Hide for admins
        { key: "help", label: "Help" },
    ];

    const getStatusText = () => {
        switch (residentProfileStatus) {
            case 1:
                return "Approved";
            case 2:
                return "Rejected";
            case 3:
                return "Pending";
            default:
                return "Not yet submitted";
        }
    };

    return (
        <div className="select-none">
            {/* Cover Photo Section */}
            <div className="relative h-48 sm:h-72 bg-gray-300">
                {coverPhotoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                        <Loader />
                    </div>
                )}
                {!coverPhotoLoading && (
                    <img
                        src={coverPhoto}
                        alt="Cover"
                        className="w-full h-full object-cover cursor-pointer"
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
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-red-500"
                                onClick={() => {
                                    handleDeletePhoto("coverPhoto");
                                    setShowCoverDropdown(false);
                                }}
                            >
                                <FaTrash className="mr-2" /> Delete Cover Photo
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
                <div
                    className="relative w-24 h-24 sm:w-36 sm:h-36"
                    ref={dropdownRef}
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    {profilePicLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-full">
                            <Loader />
                        </div>
                    )}
                    {!profilePicLoading && (
                        <img
                            src={profilePic}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover cursor-pointer border-4 border-gray-200 shadow-lg"
                        />
                    )}
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
                            <button
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-red-500"
                                onClick={() => {
                                    handleDeletePhoto("profilePic");
                                    setShowDropdown(false);
                                }}
                            >
                                <FaTrash className="mr-2" /> Delete Profile Picture
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
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30">
                    <div className="relative bg-white p-4 rounded-lg shadow-2xl max-w-3xl w-full mx-4">
                        <button
                            className="absolute top-3 right-3 text-white bg-red-500 hover:bg-red-600 transition p-2 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                            onClick={() => setShowModal(false)}
                            aria-label="Close"
                        >
                            <FaTimes className="h-6 w-6" />
                        </button>
                        <div className="flex justify-center items-center">
                            <img
                                src={modalImage}
                                alt="Full View"
                                className={`object-cover mx-auto ${modalType === "profile"
                                    ? "w-64 h-64 rounded-full"
                                    : "w-full h-auto max-h-[500px] rounded-lg"
                                    }`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b bg-gray-100 flex flex-wrap justify-center sm:justify-start relative overflow-hidden px-1 mb-4">
                {tabs.map((tab) => (
                    <div
                        key={tab.key}
                        onClick={() => handleTabClick(tab.key)}
                        className={`cursor-pointer px-4 py-3 text-sm font-medium transition-all relative ${activeTab === tab.key
                            ? "text-blue-700"
                            : "text-gray-600 hover:text-blue-700"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <motion.div
                                layoutId="tab-indicator"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Resident Profile Status */}
            {userRoleId !== 1 && ( // Hide status for admins
                <div className="py-2 px-4 text-center bg-white sm:text-left shadow-lg rounded">
                    <h3 className="text-lg font-bold">Resident Profile Status</h3>
                    <p className={`mt-2 ${residentProfileStatus === 1 ? "text-green-600" : residentProfileStatus === 2 ? "text-red-600" : residentProfileStatus === 3 ? "text-yellow-600" : "text-gray-600"}`}>
                        {getStatusText()}
                    </p>
                </div>
            )}
        </div>
    );
};

export default UserProfile;