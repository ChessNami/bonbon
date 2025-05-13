import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';
import { FaUsers } from 'react-icons/fa';
import Swal from 'sweetalert2';
import axios from 'axios';
import Loader from '../../Loader';
import HeaderControls from './HeaderControls';
import FilterSearch from './FilterSearch';
import ResidentCard from './ResidentCard';
import Pagination from './Pagination';
import ResidentProfileModal from './ResidentProfileModal';
import PendingModal from './PendingModal';
import RequestsModal from './RequestsModal';
import UpdateModal from './UpdateModal';
import RejectedModal from './RejectedModal';
import { getStatusBadge } from './Utils';

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
    const [sortOption, setSortOption] = useState('default');

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
                    image_url,
                    resident_profile_status (
                        id,
                        status,
                        rejection_reason,
                        created_at,
                        updated_at
                    )
                `);

            if (error) {
                throw new Error('Failed to fetch residents');
            }

            const formattedResidents = await Promise.all(
                data.map(async (resident) => {
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

                    let profileImageUrl = null;
                    if (resident.image_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('householdhead')
                            .createSignedUrl(resident.image_url, 7200);
                        if (signedUrlError) {
                            console.error(`Error generating signed URL for resident ${resident.id}:`, signedUrlError.message);
                        } else {
                            profileImageUrl = signedUrlData.signedUrl;
                        }
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
                        createdAt: resident.resident_profile_status?.created_at || null,
                        updatedAt: resident.resident_profile_status?.updated_at || null,
                        householdData: household,
                        spouseData: spouse,
                        householdComposition: householdComposition,
                        censusData: census,
                        childrenCount: resident.children_count || 0,
                        numberOfHouseholdMembers: resident.number_of_household_members || 0,
                        profileImageUrl: profileImageUrl,
                    };
                })
            );

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

        if (searchTerm) {
            filtered = filtered.filter((resident) =>
                `${resident.firstName} ${resident.lastName}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter((resident) => resident.status === parseInt(statusFilter));
        }

        filtered.sort((a, b) => {
            if (sortOption === 'default') {
                if (a.status === 3 && b.status !== 3) return -1;
                if (b.status === 3 && a.status !== 3) return 1;
                if (a.status === 3 && b.status === 3) {
                    return new Date(a.rejectionDate || '1970-01-01') - new Date(b.rejectionDate || '1970-01-01');
                }
                if (a.status === 1 && b.status === 1) {
                    return a.lastName.localeCompare(b.lastName);
                }
                if (a.status === 1 && b.status !== 1) return 1;
                if (b.status === 1 && a.status !== 1) return -1;
                return new Date(a.rejectionDate || '1970-01-01') - new Date(b.rejectionDate || '1970-01-01');
            }

            if (sortOption === 'name-asc') {
                return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            }

            if (sortOption === 'name-desc') {
                return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
            }

            if (sortOption === 'status-asc') {
                return a.status - b.status;
            }

            if (sortOption === 'status-desc') {
                return b.status - a.status;
            }

            if (sortOption === 'date-asc') {
                return new Date(a.rejectionDate || '1970-01-01') - new Date(b.rejectionDate || '1970-01-01');
            }

            if (sortOption === 'date-desc') {
                return new Date(b.rejectionDate || '1970-01-01') - new Date(a.rejectionDate || '1970-01-01');
            }

            if (a.status === 3 && b.status !== 3) return -1;
            if (b.status === 3 && a.status !== 3) return 1;
            if (a.status === 3 && b.status === 3) {
                return new Date(a.rejectionDate || '1970-01-01') - new Date(b.rejectionDate || '1970-01-01');
            }
            if (a.status === 1 && b.status === 1) {
                return a.lastName.localeCompare(b.lastName);
            }
            if (a.status === 1 && b.status !== 1) return 1;
            if (b.status === 1 && a.status !== 1) return -1;
            return new Date(a.rejectionDate || '1970-01-01') - new Date(b.rejectionDate || '1970-01-01');
        });

        setFilteredResidents(filtered);
    }, [residents, searchTerm, statusFilter, sortOption]);

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

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSortOption('name-asc');
        setItemsPerPage(10);
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
                    status: 6,
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('resident_id', resident.id);

            if (statusError) {
                throw new Error('Failed to update profile status to Update Profiling');
            }

            await axios.post('https://bonbon-express.vercel.app/api/email/send-update-profiling', {
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

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This action will permanently delete the resident profile and associated image.',
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
            // Fetch the resident to get the image_url
            const { data: residentData, error: fetchError } = await supabase
                .from('residents')
                .select('image_url')
                .eq('id', id)
                .single();

            if (fetchError) {
                throw new Error(`Failed to fetch resident data: ${fetchError.message}`);
            }

            // Delete the image from storage if it exists
            if (residentData.image_url) {
                const { error: storageError } = await supabase.storage
                    .from('householdhead')
                    .remove([residentData.image_url]);

                if (storageError) {
                    console.error(`Failed to delete image: ${storageError.message}`);
                    // Log the error but continue with deletion to avoid orphaned resident data
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'warning',
                        title: `Image deletion failed: ${storageError.message}. Proceeding with resident deletion.`,
                        showConfirmButton: false,
                        timer: 3000,
                        scrollbarPadding: false,
                        timerProgressBar: true,
                    });
                }
            }

            // Delete resident profile status
            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .delete()
                .eq('resident_id', id);

            if (statusError) {
                throw new Error(`Failed to delete resident status: ${statusError.message}`);
            }

            // Delete resident record
            const { error: residentError } = await supabase
                .from('residents')
                .delete()
                .eq('id', id);

            if (residentError) {
                throw new Error(`Failed to delete resident: ${residentError.message}`);
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Resident and associated image deleted successfully',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
            await fetchResidents();
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to delete resident',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true,
            });
        }
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
                await axios.post('https://bonbon-express.vercel.app/api/email/send-approval', {
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
                await axios.post('https://bonbon-express.vercel.app/api/email/send-rejection', {
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
                await axios.post('https://bonbon-express.vercel.app/api/email/send-update-approval', {
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
                await axios.post('https://bonbon-express.vercel.app/api/email/send-update-rejection', {
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

    const getModalZIndex = (modalType) => {
        const index = modalStack.indexOf(modalType);
        return index >= 0 ? 50 + index * 10 : 50;
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredResidents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResidents.length / itemsPerPage);

    return (
        <>
            {isLoading && <Loader />}
            <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
                <div className="min-h-screen p-4 mx-auto">
                    <HeaderControls
                        pendingCount={pendingCount}
                        rejectedCount={rejectedCount}
                        requestsCount={requestsCount}
                        onPending={() => setPendingModalOpen(true)}
                        onRejected={() => setRejectModalOpen(true)}
                        onRequests={() => setRequestsModalOpen(true)}
                        onReload={handleReload}
                    />
                    <FilterSearch
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        sortOption={sortOption}
                        setSortOption={setSortOption}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        onClearFilters={handleClearFilters}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {currentItems.length > 0 ? (
                            currentItems.map((resident) => (
                                <ResidentCard
                                    key={resident.id}
                                    resident={resident}
                                    onView={() => {
                                        setSelectedResident(resident);
                                        setViewModalOpen(true);
                                    }}
                                    onUpdate={() => {
                                        setSelectedResident(resident);
                                        setRejectionReason('');
                                        setUpdateModalOpen(true);
                                    }}
                                    onDelete={() => handleDelete(resident.id)}
                                    getStatusBadge={getStatusBadge}
                                />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-16">
                                <div className="text-gray-600 text-xl font-semibold">
                                    <FaUsers className="inline-block text-4xl mb-3 text-emerald-400" />
                                    <p>No residents found at this time.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            indexOfFirstItem={indexOfFirstItem}
                            indexOfLastItem={indexOfLastItem}
                            totalItems={filteredResidents.length}
                            onPaginate={setCurrentPage}
                        />
                    )}
                    <ResidentProfileModal
                        isOpen={viewModalOpen}
                        resident={selectedResident}
                        addressMappings={addressMappings}
                        onClose={() => {
                            setViewModalOpen(false);
                            setSelectedResident(null);
                        }}
                        zIndex={getModalZIndex('view')}
                    />
                    <PendingModal
                        isOpen={pendingModalOpen}
                        residents={residents.filter((r) => r.status === 3)}
                        showRejectionForm={showRejectionForm}
                        setShowRejectionForm={setShowRejectionForm}
                        rejectionReason={rejectionReason}
                        setRejectionReason={setRejectionReason}
                        onView={(resident) => {
                            setSelectedResident(resident);
                            setViewModalOpen(true);
                        }}
                        onAccept={handleAcceptProfile}
                        onReject={handleRejectProfile}
                        onClose={() => {
                            setPendingModalOpen(false);
                            setShowRejectionForm(null);
                            setRejectionReason('');
                        }}
                        zIndex={getModalZIndex('pending')}
                        getStatusBadge={getStatusBadge}
                    />
                    <RequestsModal
                        isOpen={requestsModalOpen}
                        residents={residents.filter((r) => r.status === 4)}
                        showRejectionForm={showRejectionForm}
                        setShowRejectionForm={setShowRejectionForm}
                        rejectionReason={rejectionReason}
                        setRejectionReason={setRejectionReason}
                        onView={(resident) => {
                            setSelectedResident(resident);
                            setViewModalOpen(true);
                        }}
                        onAccept={handleAcceptRequest}
                        onDecline={handleDeclineRequest}
                        onClose={() => {
                            setRequestsModalOpen(false);
                            setShowRejectionForm(null);
                            setRejectionReason('');
                        }}
                        zIndex={getModalZIndex('requests')}
                        getStatusBadge={getStatusBadge}
                    />
                    <UpdateModal
                        isOpen={updateModalOpen}
                        rejectionReason={rejectionReason}
                        setRejectionReason={setRejectionReason}
                        onSubmit={() => {
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
                        }}
                        onClose={() => {
                            setUpdateModalOpen(false);
                            setSelectedResident(null);
                            setRejectionReason('');
                        }}
                        zIndex={getModalZIndex('update')}
                    />
                    <RejectedModal
                        isOpen={rejectModalOpen}
                        residents={residents.filter((r) => r.status === 2)}
                        onClose={() => setRejectModalOpen(false)}
                        zIndex={getModalZIndex('reject')}
                        getStatusBadge={getStatusBadge}
                    />
                </div>
            </div>
        </>
    );
};

export default ResidentManagement;