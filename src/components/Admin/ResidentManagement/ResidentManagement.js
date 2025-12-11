import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';
import { FaUsers } from 'react-icons/fa';
import Swal from 'sweetalert2';
import axios from 'axios';
import bcrypt from 'bcryptjs';
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
import ToUpdateModal from './ToUpdateModal';
import { getStatusBadge } from './Utils';

const ResidentManagement = () => {
    const [residents, setResidents] = useState([]);
    const [filteredResidents, setFilteredResidents] = useState([]);
    const [showSeniorOnly, setShowSeniorOnly] = useState(false);
    const [genderFilter, setGenderFilter] = useState('all');
    const [pendingCount, setPendingCount] = useState(0);
    const [rejectedCount, setRejectedCount] = useState(0);
    const [requestsCount, setRequestsCount] = useState(0);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [requestsModalOpen, setRequestsModalOpen] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updateProfilingModalOpen, setUpdateProfilingModalOpen] = useState(false);
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
    const [isRentingFilter, setIsRentingFilter] = useState('all');
    const [hasZoneCertFilter, setHasZoneCertFilter] = useState('all');
    const [pwdStatusFilter, setPwdStatusFilter] = useState('all');
    const [zoneFilter, setZoneFilter] = useState('all');

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
                valid_id_url,
                zone_cert_url,
                spouse_valid_id_url,
                zone_cert_availability,
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
                            console.error(`Error generating signed URL for image ${resident.id}:`, signedUrlError.message);
                        } else {
                            profileImageUrl = signedUrlData.signedUrl;
                        }
                    }

                    let validIdUrl = null;
                    if (resident.valid_id_url) {
                        const fileName = resident.valid_id_url;
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(fileName, 7200);
                        if (signedUrlError) {
                            console.error(`Error generating signed URL for valid ID ${resident.id}:`, signedUrlError.message);
                        } else {
                            validIdUrl = signedUrlData.signedUrl;
                        }
                    }

                    let zoneCertUrl = null;
                    if (resident.zone_cert_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(resident.zone_cert_url, 7200);
                        if (signedUrlError) {
                            console.error(`Error generating signed URL for zone certificate ${resident.id}:`, signedUrlError.message);
                        } else {
                            zoneCertUrl = signedUrlData.signedUrl;
                        }
                    }

                    let spouseValidIdUrl = null;
                    if (resident.spouse_valid_id_url) {
                        const fileName = resident.spouse_valid_id_url;
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(fileName, 7200);
                        if (signedUrlError) {
                            console.error(`Error generating signed URL for spouse valid ID ${resident.id}:`, signedUrlError.message);
                        } else {
                            spouseValidIdUrl = signedUrlData.signedUrl;
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
                        householdData: {
                            ...household,
                            hasZoneCertificate: resident.zone_cert_availability || false,
                        },
                        spouseData: spouse,
                        householdComposition: householdComposition,
                        censusData: census,
                        childrenCount: resident.children_count || 0,
                        numberOfHouseholdMembers: resident.number_of_household_members || 0,
                        profileImageUrl: profileImageUrl,
                        validIdUrl: validIdUrl,
                        validIdPath: resident.valid_id_url || null,
                        zoneCertUrl: zoneCertUrl,
                        zoneCertPath: resident.zone_cert_url || null,
                        spouseValidIdUrl: spouseValidIdUrl,
                        spouseValidIdPath: resident.spouse_valid_id_url || null,
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

        if (isRentingFilter !== 'all') {
            filtered = filtered.filter((resident) => {
                const census = resident.censusData || {};
                return census.isRenting === isRentingFilter;
            });
        }

        if (hasZoneCertFilter !== 'all') {
            filtered = filtered.filter((resident) => {
                const hasZoneCert = resident.householdData.hasZoneCertificate;
                return hasZoneCertFilter === 'Yes' ? hasZoneCert : !hasZoneCert;
            });
        }

        if (pwdStatusFilter !== 'all') {
            filtered = filtered.filter((resident) => {
                const hasPwd = (
                    resident.householdData.pwdStatus?.toUpperCase() === 'YES' ||
                    resident.spouseData?.pwdStatus?.toUpperCase() === 'YES' ||
                    resident.householdComposition.some((member) => member.pwdStatus?.toUpperCase() === 'YES')
                );
                return pwdStatusFilter === 'Yes' ? hasPwd : !hasPwd;
            });
        }

        if (zoneFilter !== 'all') {
            filtered = filtered.filter((resident) => resident.purok === zoneFilter);
        }

        filtered.sort((a, b) => {
            if (sortOption === 'default') {
                const priorityOrder = { 3: 1, 4: 2, 5: 3, 6: 4, 1: 5 };
                const aPriority = priorityOrder[a.status] || 6;
                const bPriority = priorityOrder[b.status] || 6;

                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }

                if (aPriority === bPriority) {
                    return new Date(b.createdAt || '1970-01-01') - new Date(a.createdAt || '1970-01-01');
                }

                return 0;
            }

            if (sortOption === 'name-asc') {
                return a.lastName.localeCompare(b.lastName);
            }

            if (sortOption === 'name-desc') {
                return b.lastName.localeCompare(a.lastName);
            }

            if (sortOption === 'status-asc') {
                return a.status - b.status;
            }

            if (sortOption === 'status-desc') {
                return b.status - a.status; // Fixed typo: corrected `b.status - b.status` to `b.status - a.status`
            }

            if (sortOption === 'date-asc') {
                return new Date(a.createdAt || '1970-01-01') - new Date(b.createdAt || '1970-01-01');
            }

            if (sortOption === 'date-desc') {
                return new Date(b.createdAt || '1970-01-01') - new Date(a.createdAt || '1970-01-01');
            }

            return 0;
        });

        if (showSeniorOnly) {
            filtered = filtered.filter((resident) => {
                // dob format expected: "YYYY-MM-DD"
                if (!resident.dob) return false;
                const birthDate = new Date(resident.dob);
                const ageDiffMs = Date.now() - birthDate.getTime();
                const ageDate = new Date(ageDiffMs);
                const age = Math.abs(ageDate.getUTCFullYear() - 1970);
                return age >= 60;
            });
        }

        // Gender filter (Household Head only)
        if (genderFilter !== 'all') {
            filtered = filtered.filter((resident) => {
                const headGender = resident.gender?.trim();
                return headGender === genderFilter;
            });
        }

        setFilteredResidents(filtered);
    }, [residents, searchTerm, statusFilter, sortOption, isRentingFilter, hasZoneCertFilter, pwdStatusFilter, zoneFilter, showSeniorOnly, genderFilter]);

    // Disable scroll on body when modals are open
    useEffect(() => {
        if (viewModalOpen || pendingModalOpen || rejectModalOpen || requestsModalOpen || updateModalOpen || updateProfilingModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen, updateProfilingModalOpen]);

    // Update modal stack
    useEffect(() => {
        const stack = [];
        if (pendingModalOpen) stack.push('pending');
        if (rejectModalOpen) stack.push('reject');
        if (requestsModalOpen) stack.push('requests');
        if (updateModalOpen) stack.push('update');
        if (updateProfilingModalOpen) stack.push('updateProfiling'); // Add this line
        if (viewModalOpen) stack.push('view');
        setModalStack(stack);
    }, [viewModalOpen, pendingModalOpen, rejectModalOpen, requestsModalOpen, updateModalOpen, updateProfilingModalOpen]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSortOption('default');
        setItemsPerPage(10);
        setIsRentingFilter('all');
        setHasZoneCertFilter('all');
        setPwdStatusFilter('all');
        setZoneFilter('all');
        setShowSeniorOnly(false);
        setGenderFilter('all');
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

    const handleDelete = async (residentId) => {
        try {
            // Fetch the hashed passphrase from Supabase (assume stored in 'settings' table)
            const { data: setting, error: fetchError } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'delete_passphrase_hash')
                .single();

            if (fetchError || !setting) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Failed to fetch passphrase',
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                    timerProgressBar: true
                });
                return;
            }

            const hash = setting.value;

            // Prompt for passphrase (2FA)
            const { value: passphrase } = await Swal.fire({
                title: 'Confirm Deletion',
                text: 'Enter the secret passphrase to proceed with deletion.',
                input: 'password',
                inputPlaceholder: 'Secret passphrase',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off'
                },
                showCancelButton: true,
                confirmButtonText: 'Submit',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#EF4444',
                scrollbarPadding: false,
                inputValidator: (value) => {
                    if (!value) {
                        return 'Passphrase is required!';
                    }
                }
            });

            if (!passphrase) return; // User cancelled

            // Verify passphrase
            const isValid = bcrypt.compareSync(passphrase, hash);
            if (!isValid) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Incorrect passphrase',
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                    timerProgressBar: true
                });
                return;
            }

            // Show delay modal with countdown and cancel button
            const result = await Swal.fire({
                title: 'Deletion Scheduled',
                html: 'Deleting in <b id="countdown">10</b> seconds.<br/><br/>This action cannot be undone after the timer expires.',
                timer: 10000,
                timerProgressBar: true,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                showCancelButton: true,
                scrollbarPadding: false,
                cancelButtonText: 'Cancel Deletion',
                cancelButtonColor: '#6B7280',
                didOpen: () => {
                    let time = 10;
                    const countdownElement = document.getElementById('countdown');
                    const interval = setInterval(() => {
                        time--;
                        countdownElement.textContent = time;
                        if (time <= 0) {
                            clearInterval(interval);
                        }
                    }, 1000);
                }
            });

            if (result.dismiss === 'cancel') {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Deletion cancelled',
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                    timerProgressBar: true
                });
                return;
            }

            // Proceed with deletion after delay
            const { error: deleteError } = await supabase.from('residents').delete().eq('id', residentId);

            if (deleteError) throw deleteError;

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

            fetchResidents(); // Refresh residents list
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to delete resident',
                showConfirmButton: false,
                timer: 1500,
                scrollbarPadding: false,
                timerProgressBar: true
            });
            console.error('Error deleting resident:', error.message);
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

    // const handleRejectProfile = async (resident) => {
    //     if (!rejectionReason.trim()) {
    //         await Swal.fire({
    //             toast: true,
    //             position: 'top-end',
    //             icon: 'warning',
    //             title: 'Please provide a rejection reason',
    //             showConfirmButton: false,
    //             timer: 1500,
    //             scrollbarPadding: false,
    //             timerProgressBar: true,
    //             customClass: {
    //                 popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
    //                 title: 'text-yellow-800 text-sm',
    //             },
    //         });
    //         return;
    //     }

    //     try {
    //         Swal.fire({
    //             title: 'Rejecting resident...',
    //             scrollbarPadding: false,
    //             allowOutsideClick: false,
    //             allowEscapeKey: false,
    //             customClass: {
    //                 popup: 'rounded-xl shadow-2xl',
    //                 title: 'text-gray-800 text-lg font-semibold',
    //             },
    //             didOpen: () => {
    //                 Swal.showLoading();
    //             },
    //         });

    //         const { data: residentData, error: residentError } = await supabase
    //             .from('residents')
    //             .select('user_id')
    //             .eq('id', resident.id)
    //             .single();

    //         if (residentError || !residentData.user_id) {
    //             throw new Error(residentError?.message || 'Failed to fetch resident data');
    //         }

    //         const { error: statusError } = await supabase
    //             .from('resident_profile_status')
    //             .update({
    //                 status: 2,
    //                 rejection_reason: rejectionReason,
    //                 updated_at: new Date().toISOString(),
    //             })
    //             .eq('resident_id', resident.id);

    //         if (statusError) {
    //             throw new Error(statusError?.message || 'Failed to reject profile');
    //         }

    //         try {
    //             await axios.post('https://bonbon-express.vercel.app/api/email/send-rejection', {
    //                 userId: residentData.user_id,
    //                 rejectionReason,
    //             });
    //         } catch (emailError) {
    //             console.error('Failed to send rejection email:', emailError.message);
    //             await Swal.fire({
    //                 toast: true,
    //                 position: 'top-end',
    //                 icon: 'warning',
    //                 title: `Profile rejected, but failed to send rejection email: ${emailError.message}`,
    //                 showConfirmButton: false,
    //                 timer: 3000,
    //                 scrollbarPadding: false,
    //                 timerProgressBar: true,
    //                 customClass: {
    //                     popup: 'rounded-lg shadow-lg bg-yellow-50 border border-yellow-200',
    //                     title: 'text-yellow-800 text-sm',
    //                 },
    //             });
    //         }

    //         await Swal.close();
    //         await Swal.fire({
    //             toast: true,
    //             position: 'top-end',
    //             icon: 'success',
    //             title: 'Profile rejected successfully',
    //             showConfirmButton: false,
    //             timer: 1500,
    //             scrollbarPadding: false,
    //             timerProgressBar: true,
    //             customClass: {
    //                 popup: 'rounded-lg shadow-lg bg-green-50 border border-green-200',
    //                 title: 'text-green-800 text-sm',
    //             },
    //         });
    //         setShowRejectionForm(null);
    //         setRejectionReason('');
    //         await fetchResidents();
    //     } catch (error) {
    //         await Swal.close();
    //         await Swal.fire({
    //             toast: true,
    //             position: 'top-end',
    //             icon: 'error',
    //             title: error.message || 'Failed to reject profile',
    //             showConfirmButton: false,
    //             timer: 1500,
    //             scrollbarPadding: false,
    //             timerProgressBar: true,
    //             customClass: {
    //                 popup: 'rounded-lg shadow-lg bg-red-50 border border-red-200',
    //                 title: 'text-red-800 text-sm',
    //             },
    //         });
    //     }
    // };

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
                        updateProfilingCount={residents.filter((r) => r.status === 6).length}
                        onPending={() => setPendingModalOpen(true)}
                        onRejected={() => setRejectModalOpen(true)}
                        onRequests={() => setRequestsModalOpen(true)}
                        onUpdateProfiling={() => setUpdateProfilingModalOpen(true)}
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
                        isRentingFilter={isRentingFilter}
                        setIsRentingFilter={setIsRentingFilter}
                        hasZoneCertFilter={hasZoneCertFilter}
                        setHasZoneCertFilter={setHasZoneCertFilter}
                        pwdStatusFilter={pwdStatusFilter}
                        setPwdStatusFilter={setPwdStatusFilter}
                        zoneFilter={zoneFilter}
                        setZoneFilter={setZoneFilter}
                        showSeniorOnly={showSeniorOnly}
                        setShowSeniorOnly={setShowSeniorOnly}
                        genderFilter={genderFilter}
                        setGenderFilter={setGenderFilter}
                    />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
                    <ResidentProfileModal
                        isOpen={viewModalOpen}
                        resident={selectedResident}
                        addressMappings={addressMappings}
                        onClose={() => {
                            setViewModalOpen(false);
                            setSelectedResident(null);
                        }}
                        zIndex={getModalZIndex('view')}
                        validIdUrl={selectedResident?.validIdUrl}
                        validIdPath={selectedResident?.validIdPath}
                        zoneCertUrl={selectedResident?.zoneCertUrl}
                        zoneCertPath={selectedResident?.zoneCertPath}
                        spouseValidIdUrl={selectedResident?.spouseValidIdUrl}
                        spouseValidIdPath={selectedResident?.spouseValidIdPath}
                    />
                    <PendingModal
                        isOpen={pendingModalOpen}
                        residents={residents.filter((r) => r.status === 3)}
                        onView={(resident) => {
                            setSelectedResident(resident);
                            setViewModalOpen(true);
                        }}
                        onAccept={handleAcceptProfile}
                        onUpdate={(resident) => {
                            setSelectedResident(resident);
                            setRejectionReason('');
                            setUpdateModalOpen(true);
                        }}
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
                    <ToUpdateModal
                        isOpen={updateProfilingModalOpen}
                        residents={residents.filter((r) => r.status === 6)}
                        onView={(resident) => {
                            setSelectedResident(resident);
                            setViewModalOpen(true);
                        }}
                        onClose={() => {
                            setUpdateProfilingModalOpen(false);
                        }}
                        zIndex={getModalZIndex('updateProfiling')}
                        getStatusBadge={getStatusBadge}
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