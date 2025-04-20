import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaTimes, FaEye, FaCheck, FaBan, FaExclamationCircle, FaSyncAlt, FaTrashAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';
import Loader from '../Loader';
import axios from 'axios';
import Swal from 'sweetalert2';

const ResidentManagement = () => {
    const [residents, setResidents] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [rejectedCount, setRejectedCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [requestsModalOpen, setRequestsModalOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedResident, setSelectedResident] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionForm, setShowRejectionForm] = useState(null);
    const [addressMappings, setAddressMappings] = useState({
        region: {},
        province: {},
        city: {},
        barangay: {},
    });
    const [modalStack, setModalStack] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const viewModalRef = useRef(null);
    const pendingModalRef = useRef(null);
    const rejectModalRef = useRef(null);
    const requestsModalRef = useRef(null);
    const updateModalRef = useRef(null);
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
                    position: 'top-end',
                    icon: 'error',
                    title: 'Failed to load address mappings',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });
            }
        };

        fetchAddressMappings();
    }, []);

    const fetchResidents = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('residents')
                .select(`
                    id,
                    user_id,
                    household,
                    spouse,
                    household_composition,
                    census,
                    children_count,
                    number_of_household_members,
                    resident_profile_status (
                        id,
                        status,
                        rejection_reason,
                        updated_at
                    )
                `);

            if (error) {
                throw new Error('Failed to fetch residents');
            }

            const formattedResidents = data.map((resident) => {
                let household;
                try {
                    household = typeof resident.household === 'string'
                        ? JSON.parse(resident.household)
                        : resident.household;
                } catch (parseError) {
                    console.error(`Error parsing household for resident ${resident.id}:`, parseError);
                    household = {
                        firstName: 'Unknown',
                        lastName: 'Unknown',
                        gender: 'Unknown',
                        dob: 'Unknown',
                        address: 'Unknown',
                        zone: 'Unknown',
                    };
                }

                let spouse = null;
                try {
                    if (resident.spouse) {
                        spouse = typeof resident.spouse === 'string'
                            ? JSON.parse(resident.spouse)
                            : resident.spouse;
                    }
                } catch (parseError) {
                    console.error(`Error parsing spouse for resident ${resident.id}:`, parseError);
                    spouse = null;
                }

                let householdComposition = [];
                try {
                    if (resident.household_composition) {
                        householdComposition = typeof resident.household_composition === 'string'
                            ? JSON.parse(resident.household_composition)
                            : resident.household_composition;
                        if (!Array.isArray(householdComposition)) {
                            householdComposition = [];
                        }
                    }
                } catch (parseError) {
                    console.error(`Error parsing household_composition for resident ${resident.id}:`, parseError);
                    householdComposition = [];
                }

                let census = {};
                try {
                    if (resident.census) {
                        census = typeof resident.census === 'string'
                            ? JSON.parse(resident.census)
                            : resident.census;
                    }
                } catch (parseError) {
                    console.error(`Error parsing census for resident ${resident.id}:`, parseError);
                    census = {};
                }

                return {
                    id: resident.id,
                    userId: resident.user_id,
                    firstName: household.firstName || 'Unknown',
                    lastName: household.lastName || 'Unknown',
                    gender: household.gender || 'Unknown',
                    dob: household.dob || 'Unknown',
                    address: household.address || 'Unknown',
                    purok: household.zone || 'Unknown',
                    householdHead: `${household.firstName || 'Unknown'} ${household.lastName || 'Unknown'}`,
                    status: resident.resident_profile_status?.status || 3,
                    rejectionReason: resident.resident_profile_status?.rejection_reason,
                    rejectionDate: resident.resident_profile_status?.updated_at,
                    householdData: household,
                    spouseData: spouse,
                    householdComposition: householdComposition,
                    censusData: census, // Added censusData
                    childrenCount: resident.children_count || 0,
                    numberOfHouseholdMembers: resident.number_of_household_members || 0,
                };
            });

            setResidents(formattedResidents);
            setPendingCount(formattedResidents.filter((r) => r.status === 3).length);
            setRejectedCount(formattedResidents.filter((r) => r.status === 2).length);
            setRequestsCount(formattedResidents.filter((r) => r.status === 4).length);
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Unexpected error fetching residents',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Real-time subscription for residents and resident_profile_status
    useEffect(() => {
        fetchResidents();

        const residentsChannel = supabase
            .channel('residents-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'residents' },
                () => fetchResidents()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'resident_profile_status' },
                () => fetchResidents()
            )
            .subscribe((status, error) => {
                if (error) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Subscription error occurred',
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true
                    });
                }
            });

        return () => {
            supabase.removeChannel(residentsChannel);
        };
    }, [fetchResidents]);

    // Disable scroll on body when any modal is open
    useEffect(() => {
        if (viewModalOpen || pendingModalOpen || rejectModalOpen || requestsModalOpen || updateModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen]);

    // Update modal stack when modals open/close
    useEffect(() => {
        const stack = [];
        if (pendingModalOpen) stack.push('pending');
        if (rejectModalOpen) stack.push('reject');
        if (requestsModalOpen) stack.push('requests');
        if (updateModalOpen) stack.push('update');
        if (viewModalOpen) stack.push('view');
        setModalStack(stack);
    }, [viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen]);

    // Handle clicks outside modal to close only the topmost modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            const topModal = modalStack[modalStack.length - 1];

            if (topModal === 'view' && viewModalOpen && viewModalRef.current && !viewModalRef.current.contains(event.target)) {
                setViewModalOpen(false);
                setSelectedResident(null);
            } else if (topModal === 'pending' && pendingModalOpen && pendingModalRef.current && !pendingModalRef.current.contains(event.target)) {
                setPendingModalOpen(false);
                setShowRejectionForm(null);
                setRejectionReason('');
            } else if (topModal === 'reject' && rejectModalOpen && rejectModalRef.current && !rejectModalRef.current.contains(event.target)) {
                setRejectModalOpen(false);
            } else if (topModal === 'requests' && requestsModalOpen && requestsModalRef.current && !requestsModalRef.current.contains(event.target)) {
                setRequestsModalOpen(false);
            } else if (topModal === 'update' && updateModalOpen && updateModalRef.current && !updateModalRef.current.contains(event.target)) {
                setUpdateModalOpen(false);
                setSelectedResident(null);
                setRejectionReason('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [modalStack, viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen]);

    const handleView = (resident) => {
        setSelectedResident(resident);
        setViewModalOpen(true);
    };

    const handleUpdateStatus = async (resident, reason) => {
        try {
            Swal.fire({
                title: 'Updating status...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 4,
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to update profile status to Update Requested');
            }

            await axios.post('http://localhost:5000/api/email/send-update-request', {
                userId: resident.userId,
                updateReason: reason,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile status updated to Update Requested',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            await fetchResidents();
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to update profile status',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handleOpenUpdateModal = (resident) => {
        setSelectedResident(resident);
        setRejectionReason('');
        setUpdateModalOpen(true);
    };

    const handleSubmitUpdate = () => {
        if (!rejectionReason.trim()) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please provide a reason for the update request',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            return;
        }
        handleUpdateStatus(selectedResident, rejectionReason);
        setUpdateModalOpen(false);
        setSelectedResident(null);
        setRejectionReason('');
    };

    const handleDelete = async (id) => {
        try {
            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .delete()
                .eq('resident_id', id);

            if (statusError) {
                throw new Error('Failed to delete resident status');
            }

            const { error } = await supabase
                .from('residents')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error('Failed to delete resident');
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Resident deleted successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to delete resident',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handlePending = () => {
        setPendingModalOpen(true);
    };

    const handleRejected = () => {
        setRejectModalOpen(true);
    };

    const handleRequests = () => {
        setRequestsModalOpen(true);
    };

    const handleViewProfile = (resident) => {
        setSelectedResident(resident);
        setViewModalOpen(true);
    };

    const handleAcceptProfile = async (resident) => {
        try {
            Swal.fire({
                title: 'Approving resident...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .select('user_id')
                .eq('id', resident.id)
                .single();

            if (residentError || !residentData.user_id) {
                throw new Error('Failed to fetch resident data');
            }

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({ status: 1, updated_at: new Date().toISOString() })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to accept profile');
            }

            await axios.post('http://localhost:5000/api/email/send-approval', {
                userId: residentData.user_id,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile approved successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            await fetchResidents();
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to approve profile',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handleRejectProfile = async (resident) => {
        if (!rejectionReason.trim()) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please provide a rejection reason',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Rejecting resident...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .select('user_id')
                .eq('id', resident.id)
                .single();

            if (residentError || !residentData.user_id) {
                throw new Error('Failed to fetch resident data');
            }

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 2,
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString(),
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to reject profile');
            }

            await axios.post('http://localhost:5000/api/email/send-rejection', {
                userId: residentData.user_id,
                rejectionReason,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile rejected successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            setShowRejectionForm(null);
            setRejectionReason('');
            await fetchResidents();
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to reject profile',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handleAcceptRequest = async (resident) => {
        try {
            Swal.fire({
                title: 'Approving update request...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 5,
                    rejection_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to accept update request');
            }

            await axios.post('http://localhost:5000/api/email/send-update-approval', {
                userId: resident.userId,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Update request approved successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            await fetchResidents();
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to approve update request',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handleDeclineRequest = async (resident) => {
        if (!rejectionReason.trim()) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please provide a reason for declining the request',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Declining update request...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 1,
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString(),
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to decline update request');
            }

            await axios.post('http://localhost:5000/api/email/send-update-rejection', {
                userId: resident.userId,
                rejectionReason,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Update request declined successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            setShowRejectionForm(null);
            setRejectionReason('');
            await fetchResidents();
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to decline update request',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const handleReload = async () => {
        try {
            Swal.fire({
                title: 'Reloading residents...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await fetchResidents();

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Residents reloaded successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to reload residents',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    };

    const capitalizeWords = (str) => {
        return str
            .replace(/([A-Z])/g, ' $1')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

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

    const getModalZIndex = (modalType) => {
        const index = modalStack.indexOf(modalType);
        return index >= 0 ? 50 + index * 10 : 50;
    };

    return (
        <>
            <AnimatePresence>
                {isLoading && <Loader />}
            </AnimatePresence>
            <div className={isLoading ? 'opacity-0' : 'opacity-100'}>
                <div className="min-h-screen p-2 sm:p-4">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <div className="flex items-center space-x-4">
                            <motion.button
                                onClick={handlePending}
                                className="relative bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label="View pending residents"
                            >
                                <div className="flex items-center">
                                    <FaCheck className="mr-2" />
                                    <span>Pending</span>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                        {pendingCount}
                                    </span>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={handleRejected}
                                className="relative bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label="View rejected residents"
                            >
                                <div className="flex items-center">
                                    <FaBan className="mr-2" />
                                    <span>Rejected</span>
                                </div>
                                {rejectedCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                        {rejectedCount}
                                    </span>
                                )}
                            </motion.button>

                            <motion.button
                                onClick={handleRequests}
                                className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label="View update requests"
                            >
                                <div className="flex items-center">
                                    <FaSyncAlt className="mr-2" />
                                    <span>Requests</span>
                                </div>
                                {requestsCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                        {requestsCount}
                                    </span>
                                )}
                            </motion.button>
                        </div>

                        <motion.button
                            onClick={handleReload}
                            className="relative bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Reload residents"
                        >
                            <div className="flex items-center">
                                <FaSyncAlt />
                            </div>
                        </motion.button>
                    </div>
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">First Name</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Last Name</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden sm:table-cell">Gender</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden md:table-cell">Date of Birth</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden lg:table-cell">Address</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b hidden xl:table-cell">Purok/Zone</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {residents.filter((r) => r.status === 1).length > 0 ? (
                                        residents.filter((r) => r.status === 1).map((resident) => (
                                            <tr key={resident.id} className="hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm">
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.firstName}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.lastName}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden sm:table-cell">{resident.gender}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden md:table-cell">{resident.dob}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden lg:table-cell">
                                                    <div className="relative group w-full">
                                                        <span className="block truncate max-w-[100px] sm:max-w-[200px]">{resident.address}</span>
                                                        <span className="absolute bottom-full left-0 mb-2 z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded-md px-2 py-1 whitespace-normal max-w-[200px] sm:max-w-[300px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            {resident.address}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 hidden xl:table-cell">{resident.purok}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 border-b">
                                                    <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                                        <motion.button
                                                            onClick={() => handleView(resident)}
                                                            className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaEye />
                                                            View
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleOpenUpdateModal(resident)}
                                                            className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaSyncAlt />
                                                            Update
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDelete(resident.id)}
                                                            className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-600/90 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaTrashAlt />
                                                            Delete
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 text-center">
                                                <p className="text-sm text-gray-600">No approved residents found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* View Modal */}
                    <AnimatePresence>
                        {viewModalOpen && selectedResident && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('view') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('view') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={viewModalRef}
                                        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Resident Profile Details</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setViewModalOpen(false);
                                                    setSelectedResident(null);
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={20} />
                                            </motion.button>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            {/* Tabs */}
                                            <div className="border-b bg-gray-100 flex">
                                                {['Household Head', 'Spouse', 'Household Composition', 'Census Questions'].map((tab, index) => (
                                                    <button
                                                        key={index}
                                                        className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${activeProfileTab === index
                                                                ? 'text-blue-700 border-b-2 border-blue-700'
                                                                : 'text-gray-600 hover:text-blue-700'
                                                            }`}
                                                        onClick={() => setActiveProfileTab(index)}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="p-4 overflow-y-auto h-[calc(90vh-120px)]">
                                                {/* Household Head Tab */}
                                                {activeProfileTab === 0 && (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold">Household Head</legend>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                            {[
                                                                'firstName',
                                                                'middleName',
                                                                'lastName',
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
                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium">{label}:</label>
                                                                        <p className="p-2 border rounded capitalize">
                                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                ? addressMappings[key][selectedResident.householdData[key]] || 'N/A'
                                                                                : selectedResident.householdData[key] || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </fieldset>
                                                )}
                                                {/* Spouse Tab */}
                                                {activeProfileTab === 1 && (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold">Spouse</legend>
                                                        {selectedResident.spouseData ? (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                {[
                                                                    'firstName',
                                                                    'middleName',
                                                                    'lastName',
                                                                    'address',
                                                                    'region',
                                                                    'province',
                                                                    'city',
                                                                    'barangay',
                                                                    'dob',
                                                                    'age',
                                                                    'gender',
                                                                    'civilStatus',
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
                                                                    return (
                                                                        <div key={key}>
                                                                            <label className="font-medium">{label}:</label>
                                                                            <p className="p-2 border rounded capitalize">
                                                                                {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                    ? addressMappings[key][selectedResident.spouseData[key]] || 'N/A'
                                                                                    : selectedResident.spouseData[key] || 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-600">No spouse data available.</p>
                                                        )}
                                                    </fieldset>
                                                )}
                                                {/* Household Composition Tab */}
                                                {activeProfileTab === 2 && (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold">Household Composition</legend>
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="font-medium">Number of Children:</label>
                                                                <p className="p-2 border rounded">{selectedResident.childrenCount || 0}</p>
                                                            </div>
                                                            <div>
                                                                <label className="font-medium">Number of Other Household Members:</label>
                                                                <p className="p-2 border rounded">{selectedResident.numberOfHouseholdMembers || 0}</p>
                                                            </div>
                                                        </div>
                                                        {selectedResident.childrenCount > 0 && (
                                                            <div className="border-t pt-4">
                                                                <h3 className="font-semibold text-lg mb-2">Children</h3>
                                                                {selectedResident.householdComposition
                                                                    .filter((member) => member.relation === 'Son' || member.relation === 'Daughter')
                                                                    .map((member, index) => (
                                                                        <div key={`child-${index}`} className="border p-4 rounded-lg mb-4">
                                                                            <h4 className="font-semibold">Child {index + 1}</h4>
                                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                                                                        <div key={key}>
                                                                                            <label className="font-medium">{label}:</label>
                                                                                            <p className="p-2 border rounded capitalize">
                                                                                                {member[key] || 'N/A'}
                                                                                            </p>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                        {selectedResident.numberOfHouseholdMembers > 0 && (
                                                            <div className="border-t pt-4">
                                                                <h3 className="font-semibold text-lg mb-2">Other Household Members</h3>
                                                                {selectedResident.householdComposition
                                                                    .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                                                                    .map((member, index) => (
                                                                        <div key={`member-${index}`} className="border p-4 rounded-lg mb-4">
                                                                            <h4 className="font-semibold">Member {index + 1}</h4>
                                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                                                                        <div key={key}>
                                                                                            <label className="font-medium">{label}:</label>
                                                                                            <p className="p-2 border rounded capitalize">
                                                                                                {member[key] || 'N/A'}
                                                                                            </p>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                        {selectedResident.childrenCount === 0 && selectedResident.numberOfHouseholdMembers === 0 && (
                                                            <p>No household members or children added.</p>
                                                        )}
                                                    </fieldset>
                                                )}
                                                {/* Census Questions Tab */}
                                                {activeProfileTab === 3 && (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold">Census Questions</legend>
                                                        {selectedResident.censusData && Object.keys(selectedResident.censusData).length > 0 ? (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                                                                    <div key={key}>
                                                                        <label className="font-medium">{label}:</label>
                                                                        <p className="p-2 border rounded capitalize">
                                                                            {selectedResident.censusData[key] || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-600">No census data available.</p>
                                                        )}
                                                    </fieldset>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Pending Modal */}
                    <AnimatePresence>
                        {pendingModalOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('pending') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('pending') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={pendingModalRef}
                                        className="bg-white rounded-lg w-full max-w-md sm:max-w-2xl max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Pending Residents</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setPendingModalOpen(false);
                                                    setShowRejectionForm(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={20} />
                                            </motion.button>
                                        </div>
                                        <div className="p-4 overflow-y-auto">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">First Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Last Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {residents.filter((r) => r.status === 3).length > 0 ? (
                                                            residents.filter((r) => r.status === 3).map((resident) => (
                                                                <tr
                                                                    key={resident.id}
                                                                    className="hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm"
                                                                >
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.firstName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.lastName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b">
                                                                        {showRejectionForm === resident.id ? (
                                                                            <div className="space-y-2">
                                                                                <textarea
                                                                                    value={rejectionReason}
                                                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                                                    placeholder="Enter reason for rejection"
                                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                                                    rows="3"
                                                                                    required
                                                                                />
                                                                                <div className="flex space-x-2">
                                                                                    <motion.button
                                                                                        onClick={() => handleRejectProfile(resident)}
                                                                                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.95 }}
                                                                                        disabled={!rejectionReason.trim()}
                                                                                    >
                                                                                        <FaBan />
                                                                                        Submit Rejection
                                                                                    </motion.button>
                                                                                    <motion.button
                                                                                        onClick={() => setShowRejectionForm(null)}
                                                                                        className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.95 }}
                                                                                    >
                                                                                        <FaTimes />
                                                                                        Cancel
                                                                                    </motion.button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                                                                <motion.button
                                                                                    onClick={() => handleViewProfile(resident)}
                                                                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaEye />
                                                                                    View
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    onClick={() => handleAcceptProfile(resident)}
                                                                                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaCheck />
                                                                                    Accept
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    onClick={() => setShowRejectionForm(resident.id)}
                                                                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaBan />
                                                                                    Reject
                                                                                </motion.button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="3" className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 text-center">
                                                                    <p className="text-sm text-gray-600">No pending residents found.</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Requests Modal */}
                    <AnimatePresence>
                        {requestsModalOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('requests') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('requests') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={requestsModalRef}
                                        className="bg-white rounded-lg w-full max-w-md sm:max-w-2xl max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Update Requests</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setRequestsModalOpen(false);
                                                    setShowRejectionForm(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={20} />
                                            </motion.button>
                                        </div>
                                        <div className="p-4 overflow-y-auto">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">First Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Last Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {residents.filter((r) => r.status === 4).length > 0 ? (
                                                            residents.filter((r) => r.status === 4).map((resident) => (
                                                                <tr
                                                                    key={resident.id}
                                                                    className="hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm"
                                                                >
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.firstName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.lastName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b">
                                                                        {showRejectionForm === resident.id ? (
                                                                            <div className="space-y-2">
                                                                                <textarea
                                                                                    value={rejectionReason}
                                                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                                                    placeholder="Enter reason for declining the update request"
                                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                                                    rows="3"
                                                                                    required
                                                                                />
                                                                                <div className="flex space-x-2">
                                                                                    <motion.button
                                                                                        onClick={() => handleDeclineRequest(resident)}
                                                                                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.95 }}
                                                                                        disabled={!rejectionReason.trim()}
                                                                                    >
                                                                                        <FaBan />
                                                                                        Submit Decline
                                                                                    </motion.button>
                                                                                    <motion.button
                                                                                        onClick={() => setShowRejectionForm(null)}
                                                                                        className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                        whileHover={{ scale: 1.05 }}
                                                                                        whileTap={{ scale: 0.95 }}
                                                                                    >
                                                                                        <FaTimes />
                                                                                        Cancel
                                                                                    </motion.button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                                                                <motion.button
                                                                                    onClick={() => handleViewProfile(resident)}
                                                                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaEye />
                                                                                    View
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    onClick={() => handleAcceptRequest(resident)}
                                                                                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaCheck />
                                                                                    Accept
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    onClick={() => setShowRejectionForm(resident.id)}
                                                                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                                                    whileHover={{ scale: 1.05 }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                >
                                                                                    <FaBan />
                                                                                    Decline
                                                                                </motion.button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="3" className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 text-center">
                                                                    <p className="text-sm text-gray-600">No update requests found.</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Update Modal */}
                    <AnimatePresence>
                        {updateModalOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('update') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('update') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={updateModalRef}
                                        className="bg-white rounded-lg w-full max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Request Profile Update</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setUpdateModalOpen(false);
                                                    setSelectedResident(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={20} />
                                            </motion.button>
                                        </div>
                                        <div className="p-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="font-medium">Reason for Update Request:</label>
                                                    <textarea
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Enter reason for requesting profile update"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                                        rows="4"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex justify-end space-x-2">
                                                    <motion.button
                                                        onClick={handleSubmitUpdate}
                                                        className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors duration-200 text-sm flex items-center gap-1"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        disabled={!rejectionReason.trim()}
                                                    >
                                                        <FaSyncAlt />
                                                        Submit
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => {
                                                            setUpdateModalOpen(false);
                                                            setSelectedResident(null);
                                                            setRejectionReason('');
                                                        }}
                                                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm flex items-center gap-1"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaTimes />
                                                        Cancel
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Reject Modal */}
                    <AnimatePresence>
                        {rejectModalOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('reject') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('reject') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={rejectModalRef}
                                        className="bg-white rounded-lg w-full max-w-md sm:max-w-2xl max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Rejected Residents</h2>
                                            <motion.button
                                                onClick={() => setRejectModalOpen(false)}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={20} />
                                            </motion.button>
                                        </div>
                                        <div className="p-4 overflow-y-auto">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">First Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Last Name</th>
                                                            <th className="px-2 sm:px-4 py-2 sm:py-3 font-semibold border-b">Rejection Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {residents.filter((r) => r.status === 2).length > 0 ? (
                                                            residents.filter((r) => r.status === 2).map((resident) => (
                                                                <tr
                                                                    key={resident.id}
                                                                    className="hover:bg-gray-50 transition-colors duration-150 text-xs sm:text-sm"
                                                                >
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.firstName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">{resident.lastName}</td>
                                                                    <td className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900">
                                                                        <div className="relative group">
                                                                            <FaExclamationCircle className="text-red-500 inline-block mr-2" />
                                                                            <span className="truncate">
                                                                                Rejected on {new Date(resident.rejectionDate).toLocaleString()}
                                                                            </span>
                                                                            <div className="absolute bottom-full left-0 mb-2 z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded-md px-2 py-1 whitespace-normal max-w-[200px] sm:max-w-[300px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                                <p>
                                                                                    <strong>Reason:</strong> {resident.rejectionReason || 'No reason provided'}
                                                                                </p>
                                                                                <p>
                                                                                    <strong>Date:</strong> {new Date(resident.rejectionDate).toLocaleString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="3" className="px-2 sm:px-4 py-2 sm:py-3 border-b text-gray-900 text-center">
                                                                    <p className="text-sm text-gray-600">No rejected residents found.</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default ResidentManagement;