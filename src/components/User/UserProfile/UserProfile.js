import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import placeholderImg from "../../../img/Placeholder/placeholder.png";
import coverPhotoPlaceholder from "../../../img/Placeholder/coverphoto.png";
import Compressor from "compressorjs";
import { FaCamera, FaEye, FaEdit, FaTrash, FaTimes, FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "../../Loader";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../../utils/supabaseUtils";
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';
import axios from "axios";

const UserProfile = ({ activeTab, setActiveTab, onLoadingComplete }) => {
    const [user, setUser] = useState(null);
    const [profilePic, setProfilePic] = useState(placeholderImg);
    const [coverPhoto, setCoverPhoto] = useState(coverPhotoPlaceholder);
    const [profilePicLoading, setProfilePicLoading] = useState(true);
    const [coverPhotoLoading, setCoverPhotoLoading] = useState(true);
    const [residentProfileStatus, setResidentProfileStatus] = useState(null);
    const [rejectionReason, setRejectionReason] = useState(null);
    const [userRoleId, setUserRoleId] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCoverDropdown, setShowCoverDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [modalImage, setModalImage] = useState("");
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [residentData, setResidentData] = useState(null);
    const [addressMappings, setAddressMappings] = useState({
        region: {},
        province: {},
        city: {},
        barangay: {},
    });
    const dropdownRef = useRef(null);
    const coverDropdownRef = useRef(null);
    const coverDropdownButtonRef = useRef(null);
    const profileModalRef = useRef(null);
    const [activeProfileTab, setActiveProfileTab] = useState(0);

    // Initialize address mappings
    useEffect(() => {
        const fetchAddressMappings = () => {
            try {
                const regions = getAllRegions();
                const regionMap = regions.reduce((map, region) => {
                    map[region.psgcCode] = region.name;
                    return map;
                }, {});

                const provinces = regions.flatMap((region) => getProvincesByRegion(region.psgcCode));
                const provinceMap = provinces.reduce((map, province) => {
                    map[province.psgcCode] = province.name;
                    return map;
                }, {});

                const cities = provinces.flatMap((province) => getMunicipalitiesByProvince(province.psgcCode));
                const cityMap = cities.reduce((map, city) => {
                    map[city.psgcCode] = city.name;
                    return map;
                }, {});

                const barangays = cities.flatMap((city) => getBarangaysByMunicipality(city.psgcCode));
                const barangayMap = barangays.reduce((map, barangay) => {
                    map[barangay.psgcCode] = barangay.name;
                    return map;
                }, {});

                setAddressMappings({
                    region: regionMap,
                    province: provinceMap,
                    city: cityMap,
                    barangay: barangayMap,
                });
            } catch (error) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to load address mappings",
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                });
            }
        };

        fetchAddressMappings();
    }, []);

    // Fetch user data, role, status, photos, and resident data
    const fetchUserAndData = useCallback(async () => {
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
            setUserRoleId(null);
        } else {
            setUserRoleId(roleData.role_id);
        }

        // Fetch resident profile status and resident data (Updated to include census)
        const { data: residentData, error: residentError } = await supabase
            .from("residents")
            .select(`
        id,
        user_id,
        household,
        spouse,
        household_composition,
        census,
        children_count,
        number_of_household_members,
        image_url,
        resident_profile_status (
            status,
            rejection_reason
        )
    `)
            .eq("user_id", userData.id)
            .single();

        if (residentError || !residentData) {
            console.error("Error fetching resident data:", residentError?.message);
        } else {
            const statusData = residentData.resident_profile_status;
            setResidentProfileStatus(statusData?.status);
            setRejectionReason(statusData?.rejection_reason);

            // Parse resident data
            let household;
            try {
                household = typeof residentData.household === 'string'
                    ? JSON.parse(residentData.household)
                    : residentData.household;
            } catch (parseError) {
                console.error(`Error parsing household for user ${userData.id}:`, parseError);
                household = {};
            }

            let spouse = null;
            try {
                if (residentData.spouse) {
                    spouse = typeof residentData.spouse === 'string'
                        ? JSON.parse(residentData.spouse)
                        : residentData.spouse;
                }
            } catch (parseError) {
                console.error(`Error parsing spouse for user ${userData.id}:`, parseError);
                spouse = null;
            }

            let householdComposition = [];
            try {
                if (residentData.household_composition) {
                    householdComposition = typeof residentData.household_composition === 'string'
                        ? JSON.parse(residentData.household_composition)
                        : residentData.household_composition;
                    if (!Array.isArray(householdComposition)) {
                        householdComposition = [];
                    }
                }
            } catch (parseError) {
                console.error(`Error parsing household_composition for user ${userData.id}:`, parseError);
                householdComposition = [];
            }

            let census = {};
            try {
                if (residentData.census) {
                    census = typeof residentData.census === 'string'
                        ? JSON.parse(residentData.census)
                        : residentData.census;
                }
            } catch (parseError) {
                console.error(`Error parsing census for user ${userData.id}:`, parseError);
                census = {};
            }

            let profileImageUrl = null;
            if (residentData.image_url) {
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('householdhead')
                    .createSignedUrl(residentData.image_url, 7200);
                if (signedUrlError) {
                    console.error(`Error generating signed URL for user ${userData.id}:`, signedUrlError.message);
                } else {
                    profileImageUrl = signedUrlData.signedUrl;
                }
            }

            setResidentData({
                id: residentData.id,
                userId: residentData.user_id,
                householdData: {
                    ...household,
                    profileImageUrl: profileImageUrl,
                },
                spouseData: spouse,
                householdComposition: householdComposition,
                censusData: census,
                childrenCount: residentData.children_count || 0,
                numberOfHouseholdMembers: residentData.number_of_household_members || 0,
            });
        }

        // Fetch photos using utility
        const { profilePic: profilePicUrl, coverPhoto: coverPhotoUrl } = await fetchUserPhotos(userData.id);
        setProfilePic(profilePicUrl || placeholderImg);
        setCoverPhoto(coverPhotoUrl || coverPhotoPlaceholder);

        setProfilePicLoading(false);
        setCoverPhotoLoading(false);
        onLoadingComplete(true);
    }, [onLoadingComplete]);

    // Set up real-time subscriptions
    useEffect(() => {
        fetchUserAndData();

        // Real-time subscription for resident profile status and resident data
        const setupStatusSubscription = async () => {
            const { data: authData } = await supabase.auth.getUser();
            if (!authData?.user) return null;

            const { data: residentData } = await supabase
                .from("residents")
                .select("id")
                .eq("user_id", authData.user.id)
                .single();
            if (!residentData) return null;

            const channel = supabase
                .channel("resident_profile_status_changes")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "resident_profile_status",
                        filter: `resident_id=eq.${residentData.id}`,
                    },
                    (payload) => {
                        console.log("Resident profile status change:", payload);
                        setResidentProfileStatus(payload.new.status);
                        setRejectionReason(payload.new.rejection_reason);
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "residents",
                        filter: `user_id=eq.${authData.user.id}`,
                    },
                    () => fetchUserAndData() // Refetch resident data on change
                )
                .subscribe((status, error) => {
                    if (error) {
                        console.error("Status subscription error:", error);
                        Swal.fire({
                            toast: true,
                            position: "top-end",
                            icon: "error",
                            title: "Failed to subscribe to status updates",
                            timer: 1500,
                            showConfirmButton: false,
                            scrollbarPadding: false,
                        });
                    }
                });
            return channel;
        };

        let statusChannel;
        setupStatusSubscription().then((ch) => (statusChannel = ch));

        // Subscribe to user photos changes
        const photoUnsubscribe = subscribeToUserPhotos(user?.id, (newPhotos) => {
            setProfilePic(newPhotos.profilePic || placeholderImg);
            setCoverPhoto(newPhotos.coverPhoto || coverPhotoPlaceholder);
        });

        // Cleanup subscriptions
        return () => {
            if (statusChannel) supabase.removeChannel(statusChannel);
            if (photoUnsubscribe) photoUnsubscribe();
        };
    }, [fetchUserAndData, user?.id]);

    // Handle click outside for dropdowns and profile modal
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
            if (profileModalRef.current && !profileModalRef.current.contains(event.target) && showProfileModal) {
                setShowProfileModal(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showProfileModal]);

    // Handle file upload
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
            didOpen: () => Swal.showLoading(),
        });

        if (type === "profilePic") setProfilePicLoading(true);
        if (type === "coverPhoto") setCoverPhotoLoading(true);

        new Compressor(file, {
            quality: 0.25,
            success: async (compressedFile) => {
                const fileExt = compressedFile.name.split(".").pop();
                const fileName = `${userData.user.id}/${crypto.randomUUID()}.${fileExt}`;
                const columnName = type === "profilePic" ? "profile_pic_path" : "cover_photo_path";

                try {
                    // Fetch current photo path to delete it
                    const { data: currentPhotoData, error: fetchError } = await supabase
                        .from("user_photos")
                        .select(columnName)
                        .eq("user_id", userData.user.id)
                        .single();

                    if (fetchError && fetchError.code !== "PGRST116") {
                        console.error("Error fetching current photo path:", fetchError);
                        throw fetchError;
                    }

                    const currentPhotoPath = currentPhotoData?.[columnName];

                    // Delete the old photo from storage if it exists
                    if (currentPhotoPath) {
                        console.log(`Deleting old ${type} from storage: ${currentPhotoPath}`);
                        const { error: deleteError } = await supabase.storage
                            .from("user-assets")
                            .remove([currentPhotoPath]);
                        if (deleteError) {
                            console.error("Storage delete error:", deleteError);
                            throw deleteError;
                        }
                        console.log(`Old ${type} deleted successfully from storage`);
                    }

                    // Upload new photo to storage
                    console.log(`Uploading ${type} to storage: ${fileName}`);
                    const { error: uploadError } = await supabase.storage
                        .from("user-assets")
                        .upload(fileName, compressedFile, { upsert: true });
                    if (uploadError) {
                        console.error("Storage upload error:", uploadError);
                        throw uploadError;
                    }
                    console.log(`${type} uploaded successfully to storage`);

                    // Update user_photos table
                    console.log(`Updating user_photos table: user_id=${userData.user.id}, ${columnName}=${fileName}`);
                    const { data: upsertData, error: updateError } = await supabase
                        .from("user_photos")
                        .upsert(
                            { user_id: userData.user.id, [columnName]: fileName },
                            { onConflict: "user_id" }
                        );
                    if (updateError) {
                        console.error("Upsert error:", updateError);
                        throw updateError;
                    }
                    console.log("Upsert successful:", upsertData);

                    // Refetch photos to get signed URLs
                    console.log("Refetching photos...");
                    const { profilePic: newProfilePic, coverPhoto: newCoverPhoto } = await fetchUserPhotos(userData.user.id, true);
                    setProfilePic(newProfilePic || placeholderImg);
                    setCoverPhoto(newCoverPhoto || coverPhotoPlaceholder);

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
                    console.error("Upload process error:", error);
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
                console.error("Compression error:", err);
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

    const handleDeleteProfiling = async () => {
        if (!user || !residentData) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'User or resident data not found',
                showConfirmButton: false,
                timer: 2000,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Delete Resident Profile',
            html: `
                <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete your resident profile? This action is irreversible and will remove all associated data, including household, spouse, and census information.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            scrollbarPadding: false,
        });

        if (result.isConfirmed) {
            try {
                Swal.fire({
                    title: 'Deleting profile...',
                    text: 'Please wait while your profile is being deleted',
                    allowOutsideClick: false,
                    scrollbarPadding: false,
                    didOpen: () => Swal.showLoading(),
                });

                // Delete resident profile status
                const { error: statusError } = await supabase
                    .from('resident_profile_status')
                    .delete()
                    .eq('resident_id', residentData.id);
                if (statusError) throw new Error('Failed to delete profile status: ' + statusError.message);

                // Delete resident data
                const { error: residentError } = await supabase
                    .from('residents')
                    .delete()
                    .eq('id', residentData.id);
                if (residentError) throw new Error('Failed to delete resident data: ' + residentError.message);

                // Reset state
                setResidentData(null);
                setResidentProfileStatus('not_submitted');
                setRejectionReason(null);

                Swal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Profile Deleted',
                    text: 'Your resident profile has been successfully deleted.',
                    showConfirmButton: false,
                    timer: 2000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                });
            } catch (error) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Deletion Failed',
                    text: error.message || 'Failed to delete resident profile',
                    showConfirmButton: false,
                    timer: 2000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                });
            }
        }
    };

    // Handle photo deletion
    const handleDeletePhoto = async (type) => {
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "User is not authenticated.",
                timer: 2000,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        const currentPhotoUrl = type === "profilePic" ? profilePic : coverPhoto;
        if (currentPhotoUrl === placeholderImg || currentPhotoUrl === coverPhotoPlaceholder) {
            Swal.fire({
                icon: "info",
                title: "No Photo to Delete",
                text: `There is no ${type === "profilePic" ? "profile" : "cover"} photo to delete.`,
                timer: 2000,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        try {
            // Fetch current photo path
            const columnName = type === "profilePic" ? "profile_pic_path" : "cover_photo_path";
            const { data: currentPhotoData, error: fetchError } = await supabase
                .from("user_photos")
                .select(columnName)
                .eq("user_id", user.id)
                .single();

            if (fetchError && fetchError.code !== "PGRST116") {
                throw fetchError;
            }

            const currentPhotoPath = currentPhotoData?.[columnName];

            // Delete from storage if path exists
            if (currentPhotoPath) {
                const { error: deleteError } = await supabase.storage
                    .from("user-assets")
                    .remove([currentPhotoPath]);
                if (deleteError) throw deleteError;
            }

            // Update user_photos table
            const { error: updateError } = await supabase
                .from("user_photos")
                .update({ [columnName]: null })
                .eq("user_id", user.id);
            if (updateError) throw updateError;

            // Update state
            if (type === "profilePic") setProfilePic(placeholderImg);
            else setCoverPhoto(coverPhotoPlaceholder);

            // Refetch photos to ensure cache is updated
            const { profilePic: newProfilePic, coverPhoto: newCoverPhoto } = await fetchUserPhotos(user.id, true);
            setProfilePic(newProfilePic || placeholderImg);
            setCoverPhoto(newCoverPhoto || coverPhotoPlaceholder);

            Swal.fire({
                icon: "success",
                title: "Photo Deleted",
                text: `${type === "profilePic" ? "Profile" : "Cover"} photo has been deleted.`,
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Delete Failed",
                text: error.message,
                timer: 2000,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
        }
    };

    // Handle request to update profiling
    const handleRequestUpdate = async () => {
        if (!user || !residentData) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'User or resident data not found',
                showConfirmButton: false,
                timer: 2000,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Request Profile Update',
            html: `
                <p class="text-sm text-gray-600 mb-4">Do you want to request an update to your resident profile? This will require admin approval.</p>
                <textarea id="updateReason" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="4" placeholder="Enter reason for requesting profile update"></textarea>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Submit Request',
            cancelButtonText: 'Cancel',
            scrollbarPadding: false,
            preConfirm: () => {
                const updateReason = document.getElementById('updateReason').value;
                if (!updateReason.trim()) {
                    Swal.showValidationMessage('Please provide a reason for the update request');
                    return false;
                }
                return updateReason;
            },
        });

        if (result.isConfirmed) {
            const updateReason = result.value;
            try {
                Swal.fire({
                    title: 'Submitting request...',
                    text: 'Please wait while your request is being processed',
                    allowOutsideClick: false,
                    scrollbarPadding: false,
                    didOpen: () => Swal.showLoading(),
                });

                const { error: statusError } = await supabase
                    .from('resident_profile_status')
                    .update({
                        status: 4,
                        rejection_reason: updateReason,
                        updated_at: new Date().toISOString()
                    })
                    .eq('resident_id', residentData.id);

                if (statusError) {
                    throw new Error('Failed to request profile update: ' + statusError.message);
                }

                setResidentProfileStatus(4);
                setRejectionReason(updateReason);

                try {
                    await axios.post('https://bonbon-express.vercel.app/api/email/send-update-request', {
                        userId: user.id,
                        updateReason,
                    });
                } catch (emailError) {
                    console.error('Failed to send update request email:', emailError.message);
                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'warning',
                        title: `Update requested, but failed to send notification email: ${emailError.message}`,
                        showConfirmButton: false,
                        timer: 3000,
                        scrollbarPadding: false,
                        timerProgressBar: true,
                    });
                    return;
                }

                Swal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Update Requested',
                    text: 'Your request to update your profile has been submitted. Please wait for admin approval.',
                    showConfirmButton: false,
                    timer: 2000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                });
            } catch (error) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Request Failed',
                    text: error.message || 'Failed to request profile update',
                    showConfirmButton: false,
                    timer: 2000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                });
            }
        }
    };

    // Handle image viewing
    const handleViewImage = (image, type) => {
        setModalImage(image);
        setShowModal(true);
        setModalType(type);
    };

    // Handle view profile
    const handleViewProfile = () => {
        setShowProfileModal(true);
    };

    // Handle tab click
    const handleTabClick = async (tabKey) => {
        if (tabKey === "residentProfiling" && userRoleId !== 1) {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "Do you want to proceed to Resident Profiling?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, proceed",
                cancelButtonText: "No, cancel",
                scrollbarPadding: false,
            });

            if (result.isConfirmed) {
                Swal.fire({
                    title: "Redirecting...",
                    text: "Please wait",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    scrollbarPadding: false,
                    didOpen: () => Swal.showLoading(),
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

    // Capitalize words for labels
    const capitalizeWords = (str) => {
        return str
            .replace(/([A-Z])/g, ' $1')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const tabs = [
        { key: "myAccount", label: "My Account" },
        { key: "accountSettings", label: "Account Settings" },
        ...(userRoleId !== 1 ? [{ key: "residentProfiling", label: "Resident Profiling" }] : []),
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
            case 4:
                return "Update Requested";
            case 5:
                return "Update Approved";
            case 6:
                return "Update Profiling";
            case "not_submitted":
                return "Not yet submitted";
            default:
                return "Not yet submitted";
        }
    };

    const reloadProfileStatus = async () => {
        try {
            Swal.fire({
                title: "Reloading status...",
                allowOutsideClick: false,
                scrollbarPadding: false,
                didOpen: () => Swal.showLoading(),
            });

            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData?.user) {
                throw new Error("No user found");
            }

            const { data: residentData, error: residentError } = await supabase
                .from("residents")
                .select(`
                    resident_profile_status (
                        status,
                        rejection_reason
                    )
                `)
                .eq("user_id", authData.user.id)
                .single();

            if (residentError || !residentData) {
                // No resident data found, set status to "not_submitted"
                setResidentProfileStatus("not_submitted");
                setRejectionReason(null);

                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "info",
                    title: "No profile data found",
                    text: "Resident profile has not yet been submitted.",
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                });
                return;
            }

            const statusData = residentData.resident_profile_status;
            setResidentProfileStatus(statusData?.status || "not_submitted");
            setRejectionReason(statusData?.rejection_reason || null);

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Profile status reloaded",
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
            });
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to reload profile status",
                text: error.message,
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
            });
        }
    };

    // Modal variants for animations
    const modalVariants = {
        hidden: { opacity: 0, y: -50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 0.5, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
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
                        onClick={() => handleViewImage(coverPhoto, "cover")}
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
                                    handleViewImage(coverPhoto, "cover");
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
                                    handleViewImage(profilePic, "profile");
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
                                className={`object-cover mx-auto ${modalType === "profile" ? "w-64 h-64 rounded-full" : "w-full h-auto max-h-[500px] rounded-lg"}`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Viewing Profile */}
            <AnimatePresence>
                {showProfileModal && residentData && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black bg-opacity-60"
                            style={{ zIndex: 40 }}
                            variants={backdropVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        />
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                            style={{ zIndex: 50 }}
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="bg-white rounded-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl">
                                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Resident Profile Details</h2>
                                    <motion.button
                                        onClick={() => setShowProfileModal(false)}
                                        className="text-gray-500 hover:text-gray-800 transition-colors duration-200"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        aria-label="Close modal"
                                    >
                                        <FaTimes size={24} />
                                    </motion.button>
                                </div>
                                <div className="bg-gray-100 border-b border-gray-200">
                                    <div className="flex flex-wrap gap-3 p-6">
                                        {['Household Head', 'Spouse', 'Household Composition', 'Census Questions'].map((tab, index) => (
                                            <button
                                                key={index}
                                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeProfileTab === index
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'text-gray-600 hover:bg-gray-200 hover:text-emerald-600'
                                                    }`}
                                                onClick={() => setActiveProfileTab(index)}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                    {activeProfileTab === 0 && (
                                        <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <legend className="text-lg font-semibold text-gray-800 px-2">Household Head</legend>
                                            <div className="flex flex-col sm:flex-row gap-6">
                                                <div className="flex-shrink-0">
                                                    <div className="relative w-36 h-36 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-md">
                                                        {residentData.householdData.profileImageUrl ? (
                                                            <img
                                                                src={residentData.householdData.profileImageUrl}
                                                                alt={`${residentData.householdData.firstName} ${residentData.householdData.lastName}`}
                                                                className="w-full h-full rounded-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = placeholderImg;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
                                                                {residentData.householdData.firstName?.charAt(0)?.toUpperCase() || ''}
                                                                {residentData.householdData.lastName?.charAt(0)?.toUpperCase() || ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {[
                                                        'firstName',
                                                        'middleName',
                                                        'lastName',
                                                        'extension',
                                                        'address',
                                                        'region',
                                                        'province',
                                                        'city',
                                                        'barangay',
                                                        'zone',
                                                        'zipCode',
                                                        'dob',
                                                        'age',
                                                        'gender',
                                                        'civilStatus',
                                                        'religion',
                                                        'phoneNumber',
                                                        'idType',
                                                        'idNo',
                                                        'employmentType',
                                                        'education',
                                                    ].map((key) => {
                                                        let label = capitalizeWords(key);
                                                        if (key === 'dob') label = 'Date of Birth';
                                                        if (key === 'idType') label = 'ID Type';
                                                        if (key === 'idNo') label = 'ID Number';
                                                        if (key === 'zone') label = 'Purok/Zone';
                                                        return (
                                                            <div key={key} className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {['region', 'province', 'city', 'barangay'].includes(key)
                                                                        ? addressMappings[key][residentData.householdData[key]] || 'N/A'
                                                                        : residentData.householdData[key] || 'N/A'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {residentData.householdData.employmentType === 'employed' && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Occupation</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.householdData.occupation || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Skills</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.householdData.skills || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Company Address</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.householdData.companyAddress || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </fieldset>
                                    )}
                                    {activeProfileTab === 1 && (
                                        <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <legend className="text-lg font-semibold text-gray-800 px-2">Spouse</legend>
                                            {residentData.spouseData ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {[
                                                        'firstName',
                                                        'middleName',
                                                        'lastName',
                                                        'extension',
                                                        'address',
                                                        'region',
                                                        'province',
                                                        'city',
                                                        'barangay',
                                                        'zone',
                                                        'zipCode',
                                                        'dob',
                                                        'age',
                                                        'gender',
                                                        'civilStatus',
                                                        'religion',
                                                        'phoneNumber',
                                                        'idType',
                                                        'idNo',
                                                        'education',
                                                        'employmentType',
                                                    ].map((key) => {
                                                        let label = capitalizeWords(key);
                                                        if (key === 'dob') label = 'Date of Birth';
                                                        if (key === 'idType') label = 'ID Type';
                                                        if (key === 'idNo') label = 'ID Number';
                                                        if (key === 'zone') label = 'Purok/Zone';
                                                        return (
                                                            <div key={key} className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {['region', 'province', 'city', 'barangay'].includes(key)
                                                                        ? addressMappings[key][residentData.spouseData[key]] || 'N/A'
                                                                        : residentData.spouseData[key] || 'N/A'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {residentData.spouseData.employmentType === 'employed' && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Occupation</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.spouseData.occupation || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Skills</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.spouseData.skills || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-gray-700">Company Address</label>
                                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                    {residentData.spouseData.companyAddress || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No spouse data available.</p>
                                            )}
                                        </fieldset>
                                    )}
                                    {activeProfileTab === 2 && (
                                        <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <legend className="text-lg font-semibold text-gray-800 px-2">Household Composition</legend>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Number of Children</label>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                        {residentData.childrenCount || 0}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Number of Other Household Members</label>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                        {residentData.numberOfHouseholdMembers || 0}
                                                    </div>
                                                </div>
                                            </div>
                                            {residentData.childrenCount > 0 && (
                                                <div className="border-t border-gray-200 pt-6">
                                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Children</h3>
                                                    {residentData.householdComposition
                                                        .filter((member) => member.relation === 'Son' || member.relation === 'Daughter')
                                                        .map((member, index) => (
                                                            <div key={`child-${index}`} className="bg-gray-50 p-5 rounded-xl shadow-sm mb-4 border border-gray-200">
                                                                <h4 className="text-md font-semibold text-gray-800 mb-3">Child {index + 1}</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {[
                                                                        'firstName',
                                                                        'middleName',
                                                                        'middleInitial',
                                                                        'lastName',
                                                                        'relation',
                                                                        'gender',
                                                                        'customGender',
                                                                        'age',
                                                                        'dob',
                                                                        'education',
                                                                        'occupation',
                                                                        'isLivingWithParents',
                                                                        ...(member.isLivingWithParents === 'No'
                                                                            ? ['address', 'region', 'province', 'city', 'barangay', 'zipCode', 'zone']
                                                                            : []),
                                                                    ].map((key) => {
                                                                        let label = capitalizeWords(key);
                                                                        if (key === 'dob') label = 'Date of Birth';
                                                                        if (key === 'customGender') label = 'Custom Gender';
                                                                        if (key === 'isLivingWithParents') label = 'Is Living with Parents';
                                                                        if (key === 'zone') label = 'Purok/Zone';
                                                                        return (
                                                                            <div key={key} className="space-y-1">
                                                                                <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                                <div className="bg-white p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                                    {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                        ? addressMappings[key][member[key]] || 'N/A'
                                                                                        : member[key] || 'N/A'}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                            {residentData.numberOfHouseholdMembers > 0 && (
                                                <div className="border-t border-gray-200 pt-6">
                                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Household Members</h3>
                                                    {residentData.householdComposition
                                                        .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                                                        .map((member, index) => (
                                                            <div key={`member-${index}`} className="bg-gray-50 p-5 rounded-xl shadow-sm mb-4 border border-gray-200">
                                                                <h4 className="text-md font-semibold text-gray-800 mb-3">Member {index + 1}</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    {[
                                                                        'firstName',
                                                                        'middleName',
                                                                        'middleInitial',
                                                                        'lastName',
                                                                        'relation',
                                                                        'gender',
                                                                        'customGender',
                                                                        'age',
                                                                        'dob',
                                                                        'education',
                                                                        'occupation',
                                                                    ].map((key) => {
                                                                        let label = capitalizeWords(key);
                                                                        if (key === 'dob') label = 'Date of Birth';
                                                                        if (key === 'customGender') label = 'Custom Gender';
                                                                        return (
                                                                            <div key={key} className="space-y-1">
                                                                                <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                                <div className="bg-white p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                                    {member[key] || 'N/A'}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                            {residentData.childrenCount === 0 && residentData.numberOfHouseholdMembers === 0 && (
                                                <p className="text-sm text-gray-500 italic">No household members or children added.</p>
                                            )}
                                        </fieldset>
                                    )}
                                    {activeProfileTab === 3 && (
                                        <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <legend className="text-lg font-semibold text-gray-800 px-2">Census Questions</legend>
                                            {residentData.censusData && Object.keys(residentData.censusData).length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {[
                                                        { key: 'ownsHouse', label: 'Owns House' },
                                                        { key: 'isRenting', label: 'Is Renting' },
                                                        { key: 'yearsInBarangay', label: 'Years in Barangay' },
                                                        { key: 'isRegisteredVoter', label: 'Registered Voter' },
                                                        { key: 'voterPrecinctNo', label: 'Voter Precinct Number' },
                                                        { key: 'hasOwnComfortRoom', label: 'Own Comfort Room' },
                                                        { key: 'hasOwnWaterSupply', label: 'Own Water Supply' },
                                                        { key: 'hasOwnElectricity', label: 'Own Electricity' },
                                                    ].map(({ key, label }) => (
                                                        <div key={key} className="space-y-1">
                                                            <label className="text-sm font-medium text-gray-700">{label}</label>
                                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                {residentData.censusData[key] || 'N/A'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No census data available.</p>
                                            )}
                                        </fieldset>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="border-b bg-gray-100 flex flex-wrap justify-center sm:justify-start relative overflow-hidden px-1 mb-4">
                {tabs.map((tab) => (
                    <div
                        key={tab.key}
                        onClick={() => handleTabClick(tab.key)}
                        className={`cursor-pointer px-4 py-3 text-sm font-medium transition-all relative ${activeTab === tab.key ? "text-blue-700" : "text-gray-600 hover:text-blue-700"
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
            {userRoleId !== 1 && (
                <div className="py-2 px-4 text-center sm:text-left bg-white shadow-lg rounded">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold">Resident Profile Status</h3>
                        <motion.button
                            onClick={reloadProfileStatus}
                            className="text-gray-600 hover:text-blue-700 transition-colors duration-200"
                            whileHover={{ scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            title="Reload profile status"
                            aria-label="Reload profile status"
                        >
                            <FaSyncAlt size={20} />
                        </motion.button>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start mt-2 flex-wrap gap-2">
                        <p
                            className={`${residentProfileStatus === 1
                                ? "text-green-600"
                                : residentProfileStatus === 2
                                    ? "text-red-600"
                                    : residentProfileStatus === 3
                                        ? "text-yellow-600"
                                        : residentProfileStatus === 4
                                            ? "text-blue-600"
                                            : residentProfileStatus === 5
                                                ? "text-purple-600"
                                                : residentProfileStatus === 6
                                                    ? "text-orange-600"
                                                    : "text-gray-600"
                                }`}
                        >
                            {getStatusText()}
                        </p>
                        {residentProfileStatus === 1 && (
                            <>
                                <motion.button
                                    onClick={handleViewProfile}
                                    className="ml-2 bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FaInfoCircle />
                                    View
                                </motion.button>
                                <motion.button
                                    onClick={handleRequestUpdate}
                                    className="ml-2 bg-orange-600 text-white px-2 py-1 rounded-md hover:bg-orange-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FaEdit />
                                    Request to Update Profiling
                                </motion.button>
                            </>
                        )}
                        {residentProfileStatus !== 'not_submitted' && residentProfileStatus !== null && (
                            <motion.button
                                onClick={handleDeleteProfiling}
                                className="ml-2 bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={residentProfileStatus === 'not_submitted' || residentProfileStatus === null}
                            >
                                <FaTrash />
                                Delete Profiling
                            </motion.button>
                        )}
                    </div>
                    {(residentProfileStatus === 2 || residentProfileStatus === 4 || residentProfileStatus === 6) && rejectionReason && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                            <span className="font-semibold">Reason:</span> {rejectionReason}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserProfile;