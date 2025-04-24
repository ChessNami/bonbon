import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaTimes, FaEye, FaCheck, FaBan, FaExclamationCircle, FaSyncAlt, FaTrashAlt, FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt, FaHome, FaUsers, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';
import Loader from '../../Loader';
import axios from 'axios';
import Swal from 'sweetalert2';

const ResidentManagement = () => {
    const [residents, setResidents] = useState([]);
    const [filteredResidents, setFilteredResidents] = useState([]);
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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const viewModalRef = useRef(null);
    const pendingModalRef = useRef(null);
    const rejectModalRef = useRef(null);
    const requestsModalRef = useRef(null);
    const updateModalRef = useRef(null);
    const [activeProfileTab, setActiveProfileTab] = useState(0);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [sortOption, setSortOption] = useState('name-asc'); // Default sort: Name A-Z
    const filterDropdownRef = useRef(null);

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
                    scrollbarPadding: false,
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
                    updateReason: resident.resident_profile_status?.status === 4 ? resident.resident_profile_status?.rejection_reason : null,
                    rejectionReason: resident.resident_profile_status?.status !== 4 ? resident.resident_profile_status?.rejection_reason : null,
                    rejectionDate: resident.resident_profile_status?.updated_at,
                    householdData: household,
                    spouseData: spouse,
                    householdComposition: householdComposition,
                    censusData: census,
                    childrenCount: resident.children_count || 0,
                    numberOfHouseholdMembers: resident.number_of_household_members || 0,
                };
            });

            setResidents(formattedResidents);
            setFilteredResidents(formattedResidents);
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
                scrollbarPadding: false,
                timerProgressBar: true
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Real-time subscription
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
                        scrollbarPadding: false,
                        timerProgressBar: true
                    });
                }
            });

        return () => {
            supabase.removeChannel(residentsChannel);
        };
    }, [fetchResidents]);

    // Handle filters
    useEffect(() => {
        let filtered = [...residents];

        // Apply search term
        if (searchTerm) {
            filtered = filtered.filter(resident =>
                resident.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.purok.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(resident => resident.status === parseInt(statusFilter));
        }

        setFilteredResidents(filtered);
        setCurrentPage(1); // Reset to first page on filter change
    }, [searchTerm, statusFilter, residents]);

    // Disable scroll on body when modals are open
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

    // Update modal stack
    useEffect(() => {
        const stack = [];
        if (pendingModalOpen) stack.push('pending');
        if (rejectModalOpen) stack.push('reject');
        if (requestsModalOpen) stack.push('requests');
        if (updateModalOpen) stack.push('update');
        if (viewModalOpen) stack.push('view');
        setModalStack(stack);
    }, [viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSortOption('name-asc');
        setItemsPerPage(10);
        setShowFilterDropdown(false);
    };

    // Handle clicks outside modal
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

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredResidents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResidents.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleView = (resident) => {
        setSelectedResident(resident);
        setViewModalOpen(true);
    };

    const handleUpdateStatus = async (resident, reason) => {
        try {
            Swal.fire({
                title: 'Updating status...',
                scrollbarPadding: false,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 6, // Update Profiling
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to update profile status to Update Profiling');
            }

            await axios.post('http://localhost:5000/api/email/send-update-profiling', {
                userId: resident.userId,
                updateReason: reason,
            });

            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile status updated to Update Profiling',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
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
                scrollbarPadding: false,
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
                scrollbarPadding: false,
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
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This action will permanently delete the resident profile.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            scrollbarPadding: false,
        });

        if (!result.isConfirmed) {
            return;
        }

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
                scrollbarPadding: false,
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
                scrollbarPadding: false,
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
                scrollbarPadding: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-gray-800 text-lg font-semibold',
                },
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .select('user_id')
                .eq('id', resident.id)
                .single();

            if (residentError || !residentData.user_id) {
                throw new Error(residentError?.message || 'Failed to fetch resident data');
            }

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({ status: 1, updated_at: new Date().toISOString() })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error(statusError?.message || 'Failed to accept profile');
            }

            try {
                await axios.post('http://localhost:5000/api/email/send-approval', {
                    userId: residentData.user_id,
                });
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError.message);
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: `Profile approved, but failed to send approval email: ${emailError.message}`,
                    showConfirmButton: false,
                    timer: 3000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                        title: 'text-yellow-800 text-sm',
                    },
                });
            }

            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile approved successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-green-50 border border-green-200',
                    title: 'text-green-800 text-sm',
                },
            });
            await fetchResidents();
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to approve profile',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-red-50 border border-red-200',
                    title: 'text-red-800 text-sm',
                },
            });
        }
    };

    const handleRejectProfile = async (resident) => {
        if (!rejectionReason.trim()) {
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please provide a rejection reason',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                    title: 'text-yellow-800 text-sm',
                },
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Rejecting resident...',
                scrollbarPadding: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-gray-800 text-lg font-semibold',
                },
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .select('user_id')
                .eq('id', resident.id)
                .single();

            if (residentError || !residentData.user_id) {
                throw new Error(residentError?.message || 'Failed to fetch resident data');
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
                throw new Error(statusError?.message || 'Failed to reject profile');
            }

            try {
                await axios.post('http://localhost:5000/api/email/send-rejection', {
                    userId: residentData.user_id,
                    rejectionReason,
                });
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError.message);
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: `Profile rejected, but failed to send rejection email: ${emailError.message}`,
                    showConfirmButton: false,
                    timer: 3000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                        title: 'text-yellow-800 text-sm',
                    },
                });
            }

            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile rejected successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-green-50 border border-green-200',
                    title: 'text-green-800 text-sm',
                },
            });
            setShowRejectionForm(null);
            setRejectionReason('');
            await fetchResidents();
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to reject profile',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-red-50 border border-red-200',
                    title: 'text-red-800 text-sm',
                },
            });
        }
    };

    const handleAcceptRequest = async (resident) => {
        try {
            Swal.fire({
                title: 'Approving update request...',
                scrollbarPadding: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-gray-800 text-lg font-semibold',
                },
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .update({
                    status: 5,
                    rejection_reason: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error(statusError?.message || 'Failed to accept update request');
            }

            try {
                await axios.post('http://localhost:5000/api/email/send-update-approval', {
                    userId: resident.userId,
                });
            } catch (emailError) {
                console.error('Failed to send update approval email:', emailError.message);
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: `Update request approved, but failed to send approval email: ${emailError.message}`,
                    showConfirmButton: false,
                    timer: 3000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                        title: 'text-yellow-800 text-sm',
                    },
                });
            }

            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Update request approved successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-green-50 border border-green-200',
                    title: 'text-green-800 text-sm',
                },
            });
            await fetchResidents();
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to approve update request',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-red-50 border border-red-200',
                    title: 'text-red-800 text-sm',
                },
            });
        }
    };

    const handleDeclineRequest = async (resident) => {
        if (!rejectionReason.trim()) {
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please provide a reason for declining the request',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                    title: 'text-yellow-800 text-sm',
                },
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Declining update request...',
                scrollbarPadding: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-gray-800 text-lg font-semibold',
                },
                didOpen: () => {
                    Swal.showLoading();
                },
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
                throw new Error(statusError?.message || 'Failed to decline update request');
            }

            try {
                await axios.post('http://localhost:5000/api/email/send-update-rejection', {
                    userId: resident.userId,
                    rejectionReason,
                });
            } catch (emailError) {
                console.error('Failed to send update rejection email:', emailError.message);
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: `Update request declined, but failed to send rejection email: ${emailError.message}`,
                    showConfirmButton: false,
                    timer: 3000,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
                        title: 'text-yellow-800 text-sm',
                    },
                });
            }

            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Update request declined successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-green-50 border border-green-200',
                    title: 'text-green-800 text-sm',
                },
            });
            setShowRejectionForm(null);
            setRejectionReason('');
            await fetchResidents();
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to decline update request',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'rounded-lg shadow-lg bg-red-50 border border-red-200',
                    title: 'text-red-800 text-sm',
                },
            });
        }
    };

    const handleReload = async () => {
        try {
            Swal.fire({
                title: 'Reloading residents...',
                scrollbarPadding: false,
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
                scrollbarPadding: false,
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
                scrollbarPadding: false,
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 1:
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Approved</span>;
            case 2:
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Rejected</span>;
            case 3:
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending</span>;
            case 4:
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Update Requested</span>;
            case 5:
                return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Update Approved</span>;
            case 6:
                return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">Update Profiling</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Unknown</span>;
        }
    };

    return (
        <>
            <AnimatePresence>
                {isLoading && <Loader />}
            </AnimatePresence>
            <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
                <div className="min-h-screen p-4 mx-auto">
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <motion.button
                                onClick={handlePending}
                                className="relative bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaCheck />
                                Pending
                                {pendingCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                                        {pendingCount}
                                    </span>
                                )}
                            </motion.button>
                            <motion.button
                                onClick={handleRejected}
                                className="relative bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaBan />
                                Rejected
                                {rejectedCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                                        {rejectedCount}
                                    </span>
                                )}
                            </motion.button>
                            <motion.button
                                onClick={handleRequests}
                                className="relative bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <FaSyncAlt />
                                Requests
                                {requestsCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                                        {requestsCount}
                                    </span>
                                )}
                            </motion.button>
                        </div>
                        <motion.button
                            onClick={handleReload}
                            className="bg-gray-600 text-white p-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Reload Residents"
                        >
                            <FaSyncAlt size={18} />
                        </motion.button>
                    </div>

                    {/* Filters and Search */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 relative">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, address, or zone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm placeholder-gray-400 transition-all duration-200"
                            />
                        </div>

                        {/* Filter and Sort Dropdown */}
                        <div className="relative">
                            <motion.button
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FaFilter className="text-emerald-600" size={16} />
                                Filter & Sort
                            </motion.button>

                            <AnimatePresence>
                                {showFilterDropdown && (
                                    <motion.div
                                        ref={filterDropdownRef}
                                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="p-4">
                                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Filter by Status</h3>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="1">Approved</option>
                                                <option value="2">Rejected</option>
                                                <option value="3">Pending</option>
                                                <option value="4">Update Requested</option>
                                                <option value="5">Update Approved</option>
                                            </select>
                                        </div>
                                        <div className="p-4 border-t border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Sort By</h3>
                                            <select
                                                value={sortOption}
                                                onChange={(e) => setSortOption(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                            >
                                                <option value="name-asc">Name (A-Z)</option>
                                                <option value="name-desc">Name (Z-A)</option>
                                                <option value="status-asc">Status (Ascending)</option>
                                                <option value="status-desc">Status (Descending)</option>
                                                <option value="date-asc">Date Added (Oldest)</option>
                                                <option value="date-desc">Date Added (Newest)</option>
                                            </select>
                                        </div>
                                        <div className="p-4 border-t border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Items Per Page</h3>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                                            >
                                                <option value={5}>5 per page</option>
                                                <option value={10}>10 per page</option>
                                                <option value={20}>20 per page</option>
                                                <option value={50}>50 per page</option>
                                            </select>
                                        </div>
                                        <div className="p-4 border-t border-gray-100">
                                            <motion.button
                                                onClick={handleClearFilters}
                                                className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                Clear Filters
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Unique Resident Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {currentItems.length > 0 ? (
                            currentItems.map((resident) => {
                                // Define status-based colors
                                const statusColors = {
                                    1: { gradient: 'linear-gradient(to bottom, #10B981, #34D399)', pulse: 'bg-green-400' }, // Approved: Green
                                    2: { gradient: 'linear-gradient(to bottom, #EF4444, #F87171)', pulse: 'bg-red-400' }, // Rejected: Red
                                    3: { gradient: 'linear-gradient(to bottom, #F59E0B, #FBBF24)', pulse: 'bg-yellow-400' }, // Pending: Yellow
                                    4: { gradient: 'linear-gradient(to bottom, #3B82F6, #60A5FA)', pulse: 'bg-blue-400' }, // Update Requested: Blue
                                    5: { gradient: 'linear-gradient(to bottom, #8B5CF6, #A78BFA)', pulse: 'bg-purple-400' }, // Update Approved: Purple
                                    6: { gradient: 'linear-gradient(to bottom, #F97316, #FBBF24)', pulse: 'bg-orange-400' }, // Update Profiling: Orange
                                };

                                const { gradient, pulse } = statusColors[resident.status] || {
                                    gradient: 'linear-gradient(to bottom, #6B7280, #9CA3AF)', // Default: Gray
                                    pulse: 'bg-gray-400',
                                };

                                return (
                                    <motion.div
                                        key={resident.id}
                                        className="relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    >
                                        {/* Dynamic Color Accent */}
                                        <div
                                            className="absolute top-0 left-0 w-2 h-full"
                                            style={{ background: gradient }}
                                        />

                                        {/* Card Header with Avatar */}
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-xl shadow-md">
                                                        {resident.firstName[0]}{resident.lastName[0]}
                                                        <div
                                                            className={`absolute -top-1 -right-1 w-4 h-4 ${pulse} rounded-full border-2 border-white animate-pulse`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-extrabold text-gray-900 tracking-wide">
                                                            {resident.firstName} {resident.lastName}
                                                        </h3>
                                                        <div className="mt-1">{getStatusBadge(resident.status)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Resident Info with Icons */}
                                            <div className="space-y-3 text-sm text-gray-700">
                                                <p className="flex items-center gap-3">
                                                    <FaVenusMars className="text-emerald-500" />
                                                    <span className="font-medium"><span className="font-bold">Gender:</span> {resident.gender}</span>
                                                </p>
                                                <p className="flex items-center gap-3">
                                                    <FaCalendarAlt className="text-emerald-500" />
                                                    <span className="font-medium"><span className="font-bold">Date of Birth:</span> {resident.dob}</span>
                                                </p>
                                                <p className="flex items-center gap-3 truncate">
                                                    <FaMapMarkerAlt className="text-emerald-500" />
                                                    <span className="font-medium"><span className="font-bold">Address:</span> {resident.address}</span>
                                                </p>
                                                <p className="flex items-center gap-3">
                                                    <FaHome className="text-emerald-500" />
                                                    <span className="font-medium"><span className="font-bold">Purok/Zone:</span> {resident.purok}</span>
                                                </p>
                                                {resident.status === 6 && resident.rejection_reason && (
                                                    <p className="flex items-center gap-3 text-orange-600">
                                                        <FaExclamationTriangle className="text-orange-500" />
                                                        <span className="font-medium"><span className="font-bold">Reason:</span> {resident.rejection_reason}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons with Vibrant Colors */}
                                            <div className="flex flex-wrap gap-3 mt-6">
                                                <motion.button
                                                    onClick={() => handleView(resident)}
                                                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors duration-300"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaEye />
                                                    View
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleOpenUpdateModal(resident)}
                                                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-full hover:bg-amber-600 transition-colors duration-300"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaSyncAlt />
                                                    Update
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleDelete(resident.id)}
                                                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-500 rounded-full hover:bg-rose-600 transition-colors duration-300"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaTrashAlt />
                                                    Delete
                                                </motion.button>
                                            </div>
                                        </div>

                                        {/* Interactive Hover Overlay */}
                                        <motion.div
                                            className="absolute inset-0 bg-emerald-50 opacity-0 transition-opacity duration-500 pointer-events-none"
                                            whileHover={{ opacity: 0.15 }}
                                        />
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-16">
                                <motion.div
                                    className="text-gray-600 text-xl font-semibold"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <FaUsers className="inline-block text-4xl mb-3 text-emerald-400" />
                                    <p>No residents found at this time.</p>
                                </motion.div>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                            <div className="text-sm text-gray-600">
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredResidents.length)} of {filteredResidents.length} residents
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                                    whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                                >
                                    <FaChevronLeft />
                                </motion.button>
                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                    <motion.button
                                        key={page}
                                        onClick={() => paginate(page)}
                                        className={`px-4 py-2 rounded-md text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {page}
                                    </motion.button>
                                ))}
                                <motion.button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
                                    whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
                                >
                                    <FaChevronRight />
                                </motion.button>
                            </div>
                        </div>
                    )}

                    {/* Resident Profile Details Modal */}
                    <AnimatePresence>
                        {viewModalOpen && selectedResident && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black bg-opacity-60"
                                    style={{ zIndex: getModalZIndex('view') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                                    style={{ zIndex: getModalZIndex('view') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={viewModalRef}
                                        className="bg-white rounded-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl"
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Resident Profile Details</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setViewModalOpen(false);
                                                    setSelectedResident(null);
                                                }}
                                                className="text-gray-500 hover:text-gray-800 transition-colors duration-200"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                aria-label="Close modal"
                                            >
                                                <FaTimes size={24} />
                                            </motion.button>
                                        </div>

                                        {/* Tab Navigation */}
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

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                            {/* Household Head Tab */}
                                            {activeProfileTab === 0 && (
                                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <legend className="text-lg font-semibold text-gray-800 px-2">Household Head</legend>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                                            if (key === 'zone') label = 'Purok/Zone';
                                                            return (
                                                                <div key={key} className="space-y-1">
                                                                    <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                        {['region', 'province', 'city', 'barangay'].includes(key)
                                                                            ? addressMappings[key][selectedResident.householdData[key]] || 'N/A'
                                                                            : selectedResident.householdData[key] || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </fieldset>
                                            )}

                                            {/* Spouse Tab */}
                                            {activeProfileTab === 1 && (
                                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <legend className="text-lg font-semibold text-gray-800 px-2">Spouse</legend>
                                                    {selectedResident.spouseData ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                                                                ? addressMappings[key][selectedResident.spouseData[key]] || 'N/A'
                                                                                : selectedResident.spouseData[key] || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 italic">No spouse data available.</p>
                                                    )}
                                                </fieldset>
                                            )}

                                            {/* Household Composition Tab */}
                                            {activeProfileTab === 2 && (
                                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <legend className="text-lg font-semibold text-gray-800 px-2">Household Composition</legend>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                                        <div className="space-y-1">
                                                            <label className="text-sm font-medium text-gray-700">Number of Children</label>
                                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                                {selectedResident.childrenCount || 0}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-sm font-medium text-gray-700">Number of Other Household Members</label>
                                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                                {selectedResident.numberOfHouseholdMembers || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedResident.childrenCount > 0 && (
                                                        <div className="border-t border-gray-200 pt-6">
                                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Children</h3>
                                                            {selectedResident.householdComposition
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

                                                    {selectedResident.numberOfHouseholdMembers > 0 && (
                                                        <div className="border-t border-gray-200 pt-6">
                                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Household Members</h3>
                                                            {selectedResident.householdComposition
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

                                                    {selectedResident.childrenCount === 0 && selectedResident.numberOfHouseholdMembers === 0 && (
                                                        <p className="text-sm text-gray-500 italic">No household members or children added.</p>
                                                    )}
                                                </fieldset>
                                            )}

                                            {/* Census Questions Tab */}
                                            {activeProfileTab === 3 && (
                                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <legend className="text-lg font-semibold text-gray-800 px-2">Census Questions</legend>
                                                    {selectedResident.censusData && Object.keys(selectedResident.censusData).length > 0 ? (
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
                                                                        {selectedResident.censusData[key] || 'N/A'}
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
                                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                                    style={{ zIndex: getModalZIndex('pending') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={pendingModalRef}
                                        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                                            <h2 className="text-2xl font-semibold text-gray-800">Pending Residents</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setPendingModalOpen(false);
                                                    setShowRejectionForm(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <FaTimes size={22} />
                                            </motion.button>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 overflow-y-auto bg-gray-50">
                                            <div className="space-y-4">
                                                {residents.filter((r) => r.status === 3).length > 0 ? (
                                                    residents.filter((r) => r.status === 3).map((resident) => (
                                                        <div
                                                            key={resident.id}
                                                            className="bg-white p-5 rounded-lg shadow-sm border border-gray-100"
                                                        >
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                                        {resident.firstName} {resident.lastName}
                                                                    </h3>
                                                                    <div>{getStatusBadge(resident.status)}</div>
                                                                </div>
                                                                {showRejectionForm === resident.id ? (
                                                                    <div className="w-full sm:w-auto space-y-3">
                                                                        <textarea
                                                                            value={rejectionReason}
                                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                                            placeholder="Enter reason for rejection"
                                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                                                                            rows="4"
                                                                            required
                                                                        />
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <motion.button
                                                                                onClick={() => handleRejectProfile(resident)}
                                                                                disabled={!rejectionReason.trim()}
                                                                                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${!rejectionReason.trim()
                                                                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                                                    : 'bg-red-600 text-white hover:bg-red-700'
                                                                                    } transition-colors`}
                                                                                whileHover={{ scale: 1.05 }}
                                                                                whileTap={{ scale: 0.95 }}
                                                                            >
                                                                                <FaBan />
                                                                                Submit Rejection
                                                                            </motion.button>
                                                                            <motion.button
                                                                                onClick={() => setShowRejectionForm(null)}
                                                                                className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-600 transition-colors"
                                                                                whileHover={{ scale: 1.05 }}
                                                                                whileTap={{ scale: 0.95 }}
                                                                            >
                                                                                <FaTimes />
                                                                                Cancel
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <motion.button
                                                                            onClick={() => handleViewProfile(resident)}
                                                                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaEye />
                                                                            View
                                                                        </motion.button>
                                                                        <motion.button
                                                                            onClick={() => handleAcceptProfile(resident)}
                                                                            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-green-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaCheck />
                                                                            Accept
                                                                        </motion.button>
                                                                        <motion.button
                                                                            onClick={() => setShowRejectionForm(resident.id)}
                                                                            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaBan />
                                                                            Reject
                                                                        </motion.button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        No pending residents found.
                                                    </p>
                                                )}
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
                                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                                    style={{ zIndex: getModalZIndex('requests') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={requestsModalRef}
                                        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                                            <h2 className="text-2xl font-semibold text-gray-800">Update Requests</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setRequestsModalOpen(false);
                                                    setShowRejectionForm(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <FaTimes size={22} />
                                            </motion.button>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 overflow-y-auto bg-gray-50">
                                            <div className="space-y-4">
                                                {residents.filter((r) => r.status === 4).length > 0 ? (
                                                    residents.filter((r) => r.status === 4).map((resident) => (
                                                        <div
                                                            key={resident.id}
                                                            className="bg-white p-5 rounded-lg shadow-sm border border-gray-100"
                                                        >
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                                        {resident.firstName} {resident.lastName}
                                                                    </h3>
                                                                    <div>{getStatusBadge(resident.status)}</div>
                                                                    {resident.updateReason && (
                                                                        <p className="text-sm text-gray-600 italic mt-1">
                                                                            <span className="font-semibold">Reason for Request:</span> {resident.updateReason}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {showRejectionForm === resident.id ? (
                                                                    <div className="w-full sm:w-auto space-y-3">
                                                                        <textarea
                                                                            value={rejectionReason}
                                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                                            placeholder="Enter reason for declining the update request"
                                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                                                                            rows="4"
                                                                            required
                                                                        />
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <motion.button
                                                                                onClick={() => handleDeclineRequest(resident)}
                                                                                disabled={!rejectionReason.trim()}
                                                                                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${!rejectionReason.trim()
                                                                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                                                    : 'bg-red-600 text-white hover:bg-red-700'
                                                                                    } transition-colors`}
                                                                                whileHover={{ scale: 1.05 }}
                                                                                whileTap={{ scale: 0.95 }}
                                                                            >
                                                                                <FaBan />
                                                                                Submit Decline
                                                                            </motion.button>
                                                                            <motion.button
                                                                                onClick={() => setShowRejectionForm(null)}
                                                                                className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-600 transition-colors"
                                                                                whileHover={{ scale: 1.05 }}
                                                                                whileTap={{ scale: 0.95 }}
                                                                            >
                                                                                <FaTimes />
                                                                                Cancel
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <motion.button
                                                                            onClick={() => handleViewProfile(resident)}
                                                                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaEye />
                                                                            View
                                                                        </motion.button>
                                                                        <motion.button
                                                                            onClick={() => handleAcceptRequest(resident)}
                                                                            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-green-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaCheck />
                                                                            Accept
                                                                        </motion.button>
                                                                        <motion.button
                                                                            onClick={() => setShowRejectionForm(resident.id)}
                                                                            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                        >
                                                                            <FaBan />
                                                                            Decline
                                                                        </motion.button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        No update requests found.
                                                    </p>
                                                )}
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
                                        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-xl font-bold text-gray-900">Request Profile Update</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setUpdateModalOpen(false);
                                                    setSelectedResident(null);
                                                    setRejectionReason('');
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
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
                                                <div className="flex justify-end gap-2">
                                                    <motion.button
                                                        onClick={handleSubmitUpdate}
                                                        disabled={!rejectionReason.trim()}
                                                        className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${!rejectionReason.trim()
                                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                            : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                                            }`}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
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
                                                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm flex items-center gap-2"
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
                                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                                    style={{ zIndex: getModalZIndex('reject') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={rejectModalRef}
                                        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                                            <h2 className="text-2xl font-semibold text-gray-800">Rejected Residents</h2>
                                            <motion.button
                                                onClick={() => setRejectModalOpen(false)}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <FaTimes size={22} />
                                            </motion.button>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 overflow-y-auto bg-gray-50">
                                            <div className="space-y-4">
                                                {residents.filter((r) => r.status === 2).length > 0 ? (
                                                    residents.filter((r) => r.status === 2).map((resident) => (
                                                        <div
                                                            key={resident.id}
                                                            className="bg-white p-5 rounded-lg shadow-sm border border-gray-100"
                                                        >
                                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                                        {resident.firstName} {resident.lastName}
                                                                    </h3>
                                                                    <div>{getStatusBadge(resident.status)}</div>
                                                                </div>
                                                                <div className="relative group">
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                        <FaExclamationCircle className="text-red-500" />
                                                                        <span>
                                                                            Rejected on {new Date(resident.rejectionDate).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="absolute bottom-full left-0 mb-2 z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded-md px-3 py-2 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                                                                        <p><strong>Reason:</strong> {resident.rejectionReason || 'No reason provided'}</p>
                                                                        <p><strong>Date:</strong> {new Date(resident.rejectionDate).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        No rejected residents found.
                                                    </p>
                                                )}
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