import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaTimes, FaEye, FaCheck, FaBan, FaExclamationCircle, FaEdit, FaTrashAlt } from 'react-icons/fa';
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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedResident, setSelectedResident] = useState(null);
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        dob: '',
        address: '',
        purok: '',
    });
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
    const editModalRef = useRef(null);
    const pendingModalRef = useRef(null);
    const rejectModalRef = useRef(null);

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
                household,
                spouse,
                household_composition,
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

                return {
                    id: resident.id,
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
                    childrenCount: resident.children_count || 0,
                    numberOfHouseholdMembers: resident.number_of_household_members || 0,
                };
            });

            setResidents(formattedResidents);
            setPendingCount(formattedResidents.filter((r) => r.status === 3).length);
            setRejectedCount(formattedResidents.filter((r) => r.status === 2).length);
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
        if (viewModalOpen || editModalOpen || pendingModalOpen || rejectModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [viewModalOpen, editModalOpen, pendingModalOpen, rejectModalOpen]);

    // Update modal stack when modals open/close
    useEffect(() => {
        const stack = [];
        if (pendingModalOpen) stack.push('pending');
        if (rejectModalOpen) stack.push('reject');
        if (viewModalOpen) stack.push('view');
        if (editModalOpen) stack.push('edit');
        setModalStack(stack);
    }, [viewModalOpen, editModalOpen, pendingModalOpen, rejectModalOpen]);

    // Handle clicks outside modal to close only the topmost modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            const topModal = modalStack[modalStack.length - 1];

            if (topModal === 'view' && viewModalOpen && viewModalRef.current && !viewModalRef.current.contains(event.target)) {
                setViewModalOpen(false);
                setSelectedResident(null);
            } else if (topModal === 'edit' && editModalOpen && editModalRef.current && !editModalRef.current.contains(event.target)) {
                setEditModalOpen(false);
                setSelectedResident(null);
            } else if (topModal === 'pending' && pendingModalOpen && pendingModalRef.current && !pendingModalRef.current.contains(event.target)) {
                setPendingModalOpen(false);
                setShowRejectionForm(null);
                setRejectionReason('');
            } else if (topModal === 'reject' && rejectModalOpen && rejectModalRef.current && !rejectModalRef.current.contains(event.target)) {
                setRejectModalOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [modalStack, viewModalOpen, editModalOpen, pendingModalOpen, rejectModalOpen]);

    const handleView = (resident) => {
        setSelectedResident(resident);
        setViewModalOpen(true);
    };

    const handleEdit = (resident) => {
        setSelectedResident(resident);
        setEditForm({
            firstName: resident.firstName,
            lastName: resident.lastName,
            gender: resident.gender,
            dob: resident.dob,
            address: resident.address,
            purok: resident.purok,
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('residents')
                .select('household')
                .eq('id', selectedResident.id)
                .single();

            if (error) {
                throw new Error('Failed to fetch resident data for editing');
            }

            let household = typeof data.household === 'string'
                ? JSON.parse(data.household)
                : data.household;

            household.firstName = editForm.firstName;
            household.lastName = editForm.lastName;
            household.gender = editForm.gender;
            household.dob = editForm.dob;
            household.address = editForm.address;
            household.zone = editForm.purok;

            const { error: updateError } = await supabase
                .from('residents')
                .update({ household, updated_at: new Date().toISOString() })
                .eq('id', selectedResident.id);

            if (updateError) {
                throw new Error('Failed to update resident');
            }

            setEditModalOpen(false);
            setSelectedResident(null);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Resident updated successfully',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Failed to update resident',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
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
                    <div className="flex justify-start items-center mb-4 sm:mb-6 space-x-4">
                        <motion.button
                            onClick={handlePending}
                            className="relative bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm sm:text-base uppercase font-bold shadow-md"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
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
                                                            onClick={() => handleEdit(resident)}
                                                            className="bg-yellow-500 text-white px-2 py-1 rounded-md hover:bg-yellow-600 transition-colors duration-200 text-xs sm:text-sm flex items-center gap-1"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaEdit />
                                                            Edit
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
                                        <div className="p-4 overflow-y-auto">
                                            <div className="space-y-6">
                                                {/* Household Head Section */}
                                                <fieldset className="border p-4 rounded-lg">
                                                    <legend className="font-semibold text-lg">Household Head</legend>
                                                    {Object.keys(selectedResident.householdData).length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {[
                                                                'firstName',
                                                                'middleName',
                                                                'middleInitial',
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
                                                                'religion',
                                                                'extension',
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'idType') label = 'ID Type';
                                                                if (key === 'idNo') label = 'ID Number';
                                                                if (key === 'zone') label = 'Purok/Zone';

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium">{label}:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                ? addressMappings[key][selectedResident.householdData[key]] ||
                                                                                selectedResident.householdData[key] ||
                                                                                'N/A'
                                                                                : selectedResident.householdData[key] || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                            {selectedResident.householdData.employmentType === 'employed' && (
                                                                <>
                                                                    <div>
                                                                        <label className="font-medium">Occupation:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.householdData.occupation || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="font-medium">Skills:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.householdData.skills || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="font-medium">Company Address:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.householdData.companyAddress || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-600">No household head data available.</p>
                                                    )}
                                                </fieldset>

                                                {/* Spouse Section (if applicable) */}
                                                {selectedResident.spouseData ? (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold text-lg">Spouse</legend>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {[
                                                                'firstName',
                                                                'middleName',
                                                                'middleInitial',
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
                                                                'religion',
                                                                'extension',
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'idType') label = 'ID Type';
                                                                if (key === 'idNo') label = 'ID Number';
                                                                if (key === 'zone') label = 'Purok/Zone';

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium">{label}:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                ? addressMappings[key][selectedResident.spouseData[key]] ||
                                                                                selectedResident.spouseData[key] ||
                                                                                'N/A'
                                                                                : selectedResident.spouseData[key] || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                            {selectedResident.spouseData.employmentType === 'employed' && (
                                                                <>
                                                                    <div>
                                                                        <label className="font-medium">Occupation:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.spouseData.occupation || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="font-medium">Skills:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.spouseData.skills || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="font-medium">Company Address:</label>
                                                                        <p className="p-2 border rounded text-sm">
                                                                            {selectedResident.spouseData.companyAddress || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </fieldset>
                                                ) : (
                                                    <fieldset className="border p-4 rounded-lg">
                                                        <legend className="font-semibold text-lg">Spouse</legend>
                                                        <p className="text-sm text-gray-600">No spouse data available.</p>
                                                    </fieldset>
                                                )}

                                                {/* Household Composition Section */}
                                                <fieldset className="border p-4 rounded-lg">
                                                    <legend className="font-semibold text-lg">Household Composition</legend>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="font-medium">Number of Children:</label>
                                                            <p className="p-2 border rounded text-sm">{selectedResident.childrenCount || 0}</p>
                                                        </div>
                                                        <div>
                                                            <label className="font-medium">Number of Household Members:</label>
                                                            <p className="p-2 border rounded text-sm">{selectedResident.numberOfHouseholdMembers || 0}</p>
                                                        </div>
                                                    </div>
                                                    {selectedResident.householdComposition.length > 0 ? (
                                                        selectedResident.householdComposition.map((member, index) => (
                                                            <div key={index} className="border-t pt-4">
                                                                <h3 className="font-semibold text-md">Member {index + 1}</h3>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {[
                                                                        'firstName',
                                                                        'middleName',
                                                                        'middleInitial',
                                                                        'lastName',
                                                                        'relation',
                                                                        'gender',
                                                                        'age',
                                                                        'dob',
                                                                        'education',
                                                                        'occupation',
                                                                    ].map((key) => {
                                                                        let label = capitalizeWords(key);
                                                                        if (key === 'dob') label = 'Date of Birth';

                                                                        return (
                                                                            <div key={key}>
                                                                                <label className="font-medium">{label}:</label>
                                                                                <p className="p-2 border rounded text-sm">{member[key] || 'N/A'}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-gray-600">No household members added.</p>
                                                    )}
                                                </fieldset>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Edit Modal */}
                    <AnimatePresence>
                        {editModalOpen && selectedResident && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black"
                                    style={{ zIndex: getModalZIndex('edit') - 10 }}
                                    variants={backdropVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                />
                                <motion.div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: getModalZIndex('edit') }}
                                    variants={modalVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    <div
                                        ref={editModalRef}
                                        className="bg-white rounded-lg w-full max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-4 border-b">
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Resident</h2>
                                            <motion.button
                                                onClick={() => {
                                                    setEditModalOpen(false);
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
                                        <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col">
                                            <div className="p-4 overflow-y-auto">
                                                <div className="space-y-4 text-sm sm:text-base">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.firstName}
                                                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.lastName}
                                                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                                                        <select
                                                            value={editForm.gender}
                                                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        >
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                                        <input
                                                            type="date"
                                                            value={editForm.dob}
                                                            onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Address</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.address}
                                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Purok/Zone</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.purok}
                                                            onChange={(e) => setEditForm({ ...editForm, purok: e.target.value })}
                                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t flex justify-end space-x-3">
                                                <motion.button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditModalOpen(false);
                                                        setSelectedResident(null);
                                                    }}
                                                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-200 text-sm sm:text-base flex items-center gap-1"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaTimes />
                                                    Cancel
                                                </motion.button>
                                                <motion.button
                                                    type="submit"
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base flex items-center gap-1"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaCheck />
                                                    Save
                                                </motion.button>
                                            </div>
                                        </form>
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