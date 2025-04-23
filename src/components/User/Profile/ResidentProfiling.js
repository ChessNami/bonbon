import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HouseholdForm from './HouseholdForm';
import SpouseForm from './SpouseForm';
import HouseholdComposition from './HouseholdComposition';
import CensusQuestions from './CensusQuestions';
import Loader from '../../Loader';
import { supabase } from '../../../supabaseClient';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    getAllRegions,
    getProvincesByRegion,
    getMunicipalitiesByProvince,
    getBarangaysByMunicipality,
} from '@aivangogh/ph-address';

const ResidentProfiling = () => {
    const [activeTab, setActiveTab] = useState('householdForm');
    const [activeConfirmationTab, setActiveConfirmationTab] = useState('householdHead');
    const [formData, setFormData] = useState({
        household: {},
        spouse: null,
        householdComposition: [],
        census: {},
        childrenCount: 0,
        numberOfhouseholdMembers: 0,
    });
    const [userId, setUserId] = useState(null);
    const [addressMappings, setAddressMappings] = useState({
        region: {},
        province: {},
        city: {},
        barangay: {},
    });
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [profileStatus, setProfileStatus] = useState(null);

    const tabs = [
        { key: 'householdForm', label: 'Household Head Form' },
        { key: 'spouseForm', label: 'Spouse Information' },
        { key: 'householdComposition', label: 'Household Composition' },
        { key: 'censusQuestions', label: 'Census Questions' },
        { key: 'confirmation', label: 'Confirmation' },
    ];

    const confirmationTabs = [
        { key: 'householdHead', label: 'Household Head' },
        { key: 'spouse', label: 'Spouse', disabled: !formData.spouse },
        { key: 'householdComposition', label: 'Household Composition' },
        { key: 'census', label: 'Census Questions' },
    ];

    useEffect(() => {
        const fetchUserAndData = async (isInitial = false) => {
            if (isInitial) setIsInitialLoading(true);
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    console.error('Error fetching user or no user logged in:', authError?.message);
                    if (!isInitial) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Please log in to continue',
                            timer: 1500,
                            scrollbarPadding: false,
                            showConfirmButton: false,
                        });
                    }
                    if (isInitial) setIsInitialLoading(false);
                    return;
                }

                setUserId(user.id);
                const { data, error } = await supabase
                    .from('residents')
                    .select('*, resident_profile_status(status)')
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    setFormData({
                        household: data.household || {},
                        spouse: data.spouse || null,
                        householdComposition: Array.isArray(data.household_composition)
                            ? data.household_composition
                            : [],
                        census: data.census || {},
                        childrenCount: data.children_count || 0,
                        numberOfhouseholdMembers: data.number_of_household_members || 0,
                    });
                    setProfileStatus(data.resident_profile_status?.status || null);
                    if (data.resident_profile_status?.status === 2) {
                        setFormData({
                            household: {},
                            spouse: null,
                            householdComposition: [],
                            census: {},
                            childrenCount: 0,
                            numberOfhouseholdMembers: 0,
                        });
                    }
                } else {
                    setFormData({
                        household: {},
                        spouse: null,
                        householdComposition: [],
                        census: {},
                        childrenCount: 0,
                        numberOfhouseholdMembers: 0,
                    });
                    setProfileStatus(null);
                }
            } catch (error) {
                console.error('Unexpected error in fetchUserAndData:', error.message);
            } finally {
                if (isInitial) setIsInitialLoading(false);
            }
        };

        const fetchAddressMappings = () => {
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

            const cities = provinces.flatMap((province) =>
                getMunicipalitiesByProvince(province.psgcCode)
            );
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
        };

        fetchUserAndData(true);
        fetchAddressMappings();

        const intervalId = setInterval(() => fetchUserAndData(false), 5000);
        return () => clearInterval(intervalId);
    }, []);

    const handleNext = (data, nextTab, childrenCount, numberOfhouseholdMembers) => {
        setFormData((prev) => {
            if (activeTab === 'householdForm') {
                // Check civilStatus to determine the next tab
                const isMarried = data.civilStatus === 'Married';
                return {
                    ...prev,
                    household: data,
                    spouse: isMarried ? { ...prev.spouse, civilStatus: 'Married' } : null,
                };
            } else if (nextTab === 'householdComposition') {
                return { ...prev, spouse: data };
            } else if (nextTab === 'censusQuestions') {
                return {
                    ...prev,
                    householdComposition: Array.isArray(data) ? data : [],
                    childrenCount: childrenCount !== undefined ? parseInt(childrenCount, 10) || 0 : prev.childrenCount,
                    numberOfhouseholdMembers:
                        numberOfhouseholdMembers !== undefined
                            ? parseInt(numberOfhouseholdMembers, 10) || 0
                            : prev.numberOfhouseholdMembers,
                };
            } else if (nextTab === 'confirmation') {
                return { ...prev, census: data };
            } else {
                // Fallback for unexpected cases
                return prev;
            }
        });

        // Determine the next tab
        if (activeTab === 'householdForm') {
            // If civilStatus is Married, go to spouseForm; otherwise, go to householdComposition
            setActiveTab(data.civilStatus === 'Married' ? 'spouseForm' : 'householdComposition');
        } else if (nextTab) {
            setActiveTab(nextTab);
        } else {
            // Move to the next tab in the defined order
            const currentIndex = tabs.findIndex((t) => t.key === activeTab);
            setActiveTab(tabs[Math.min(currentIndex + 1, tabs.length - 1)].key);
        }
        setActiveConfirmationTab('householdHead');
    };

    const handleBack = () => {
        const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
        if (currentIndex > 0) {
            setActiveTab(tabs[currentIndex - 1].key);
        }
    };

    const handleSubmit = async () => {
        if (profileStatus === 1) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Profile already approved',
                timer: 1500,
                scrollbarPadding: false,
                showConfirmButton: false,
            });
            return;
        }

        const loadingSwal = Swal.fire({
            title: 'Submitting...',
            text: 'Please wait while your profile is being submitted',
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const requiredHouseholdFields = [
                'firstName',
                'lastName',
                'middleName',
                'address',
                'region',
                'province',
                'city',
                'barangay',
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
            ];
            for (let field of requiredHouseholdFields) {
                if (!formData.household[field]) {
                    await loadingSwal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Household form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    return;
                }
            }

            if (formData.household.civilStatus === 'Married' && !formData.spouse) {
                await loadingSwal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Spouse information is required for married status',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                return;
            }

            if (formData.spouse) {
                const requiredSpouseFields = [
                    'firstName',
                    'lastName',
                    'middleName',
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
                ];
                for (let field of requiredSpouseFields) {
                    if (!formData.spouse[field]) {
                        await loadingSwal.close();
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: `Spouse form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                            timer: 1500,
                            scrollbarPadding: false,
                            showConfirmButton: false,
                        });
                        return;
                    }
                }
            }

            if (formData.numberOfhouseholdMembers > 0 || formData.childrenCount > 0) {
                for (let [index, member] of formData.householdComposition.entries()) {
                    const requiredMemberFields = [
                        'firstName',
                        'lastName',
                        'relation',
                        'gender',
                        'age',
                        'dob',
                        'education',
                    ];
                    if (member.relation === 'Son' || member.relation === 'Daughter') {
                        requiredMemberFields.push('isLivingWithParents');
                        if (member.isLivingWithParents === 'No') {
                            requiredMemberFields.push('address', 'region', 'province', 'city', 'barangay', 'zipCode');
                        }
                    }
                    for (let field of requiredMemberFields) {
                        if (!member[field]) {
                            await loadingSwal.close();
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'error',
                                title: `Household composition is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required for member ${index + 1}`,
                                timer: 1500,
                                scrollbarPadding: false,
                                showConfirmButton: false,
                            });
                            return;
                        }
                    }
                }
            }

            const requiredCensusFields = [
                'ownsHouse',
                'isRenting',
                'yearsInBarangay',
                'isRegisteredVoter',
                'hasOwnComfortRoom',
                'hasOwnWaterSupply',
                'hasOwnElectricity',
            ];
            for (let field of requiredCensusFields) {
                if (!formData.census[field]) {
                    await loadingSwal.close();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Census form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    return;
                }
            }

            if (formData.census.isRegisteredVoter === 'Yes' && !formData.census.voterPrecinctNo) {
                await loadingSwal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Census form is incomplete: Voter’s Precinct Number is required',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                return;
            }

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .upsert(
                    {
                        user_id: userId,
                        household: formData.household,
                        spouse: formData.spouse,
                        household_composition: formData.householdComposition,
                        census: formData.census,
                        children_count: parseInt(formData.childrenCount, 10) || 0,
                        number_of_household_members: parseInt(formData.numberOfhouseholdMembers, 10) || 0,
                    },
                    { onConflict: 'user_id' }
                )
                .select()
                .single();

            if (residentError) {
                console.error('Error saving resident data:', residentError);
                await loadingSwal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: `Failed to save resident data: ${residentError.message}`,
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                return;
            }

            const newStatus = profileStatus === 4 ? 5 : 3;

            const { error: statusError } = await supabase
                .from('resident_profile_status')
                .upsert(
                    {
                        resident_id: residentData.id,
                        status: newStatus,
                    },
                    { onConflict: 'resident_id' }
                );

            if (statusError) {
                console.error('Error setting resident profile status:', statusError);
                await loadingSwal.close();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: `Failed to set resident profile status: ${statusError.message}`,
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                return;
            }

            if (newStatus === 3) {
                await axios.post('http://localhost:5000/api/email/send-pending', {
                    userId,
                });
            }

            await loadingSwal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Form submitted successfully with status: ${newStatus === 5 ? 'Update Approved' : 'Pending'}`,
                timer: 1500,
                scrollbarPadding: false,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            await loadingSwal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: `An unexpected error occurred: ${error.message || 'Unknown error'}`,
                timer: 1500,
                scrollbarPadding: false,
                showConfirmButton: false,
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

    const renderActiveTab = () => {
        if (isInitialLoading) {
            return <Loader />;
        }

        if (!userId) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Please log in to continue',
                timer: 1500,
                scrollbarPadding: false,
                showConfirmButton: false,
            });
            return null;
        }

        if (profileStatus === 1) {
            return (
                <div className="relative flex items-center justify-center min-h-[50vh] w-full px-4">
                    <div className="absolute inset-0 bg-green-100 opacity-50 rounded-lg"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600">Profiling Approved</h2>
                        <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-gray-600">
                            Your resident profile has been successfully approved.
                        </p>
                    </div>
                </div>
            );
        }

        if (profileStatus === 4) {
            return (
                <div className="relative flex items-center justify-center min-h-[50vh] w-full px-4">
                    <div className="absolute inset-0 bg-blue-100 opacity-50 rounded-lg"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">Update Request Pending</h2>
                        <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-gray-600">
                            Your request to update your resident profile is pending admin approval.
                        </p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'householdForm':
                return (
                    <HouseholdForm
                        data={formData.household}
                        onNext={(data) => handleNext(data)} // Remove hardcoded nextTab
                        onBack={null}
                        userId={userId}
                    />
                );
            case 'spouseForm':
                return (
                    <SpouseForm
                        data={formData.spouse}
                        onNext={(data) => handleNext(data, 'householdComposition')}
                        onBack={handleBack}
                        userId={userId}
                    />
                );
            case 'householdComposition':
                return (
                    <HouseholdComposition
                        data={formData.householdComposition}
                        childrenCount={formData.childrenCount}
                        numberOfhouseholdMembers={formData.numberOfhouseholdMembers}
                        onNext={(data, childrenCount, numberOfhouseholdMembers) =>
                            handleNext(data, 'censusQuestions', childrenCount, numberOfhouseholdMembers)
                        }
                        onBack={handleBack}
                        userId={userId}
                    />
                );
            case 'censusQuestions':
                return (
                    <CensusQuestions
                        data={formData.census}
                        onNext={(data) => handleNext(data, 'confirmation')}
                        onBack={handleBack}
                        userId={userId}
                    />
                );
            case 'confirmation':
                return (
                    <div className="w-full">
                        <div className="border-b bg-gray-100 flex flex-wrap mb-4">
                            {confirmationTabs.map((tab) => (
                                <div
                                    key={tab.key}
                                    onClick={() => !tab.disabled && setActiveConfirmationTab(tab.key)}
                                    className={`cursor-pointer px-3 py-2 text-xs sm:text-sm font-medium flex-shrink-0 ${activeConfirmationTab === tab.key
                                        ? 'border-b-2 border-blue-700 text-blue-700'
                                        : 'text-gray-600 hover:text-blue-700'
                                        } ${tab.disabled ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    {tab.label}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeConfirmationTab === 'householdHead' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Household Head</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                                    <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                    <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm capitalize break-words">
                                                        {['region', 'province', 'city', 'barangay'].includes(key)
                                                            ? addressMappings[key][formData.household[key]] || 'N/A'
                                                            : formData.household[key] || 'N/A'}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            {activeConfirmationTab === 'spouse' && formData.spouse && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Spouse</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                                    <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                    <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm capitalize break-words">
                                                        {['region', 'province', 'city', 'barangay'].includes(key)
                                                            ? addressMappings[key][formData.spouse[key]] || 'N/A'
                                                            : formData.spouse[key] || 'N/A'}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            {activeConfirmationTab === 'householdComposition' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Household Composition</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                                        <div>
                                            <label className="font-medium text-xs sm:text-sm">Number of Children:</label>
                                            <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm">{formData.childrenCount}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium text-xs sm:text-sm">Number of Other Household Members:</label>
                                            <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm">{formData.numberOfhouseholdMembers}</p>
                                        </div>
                                    </div>

                                    {formData.childrenCount > 0 && (
                                        <div className="border-t pt-4">
                                            <h3 className="font-semibold text-base sm:text-lg mb-2">Children</h3>
                                            {formData.householdComposition
                                                .filter((member) => member.relation === 'Son' || member.relation === 'Daughter')
                                                .map((member, index) => (
                                                    <div key={`child-${index}`} className="border p-3 sm:p-4 rounded-lg mb-4">
                                                        <h4 className="font-semibold text-sm sm:text-base">Child {index + 1}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                                                if (key === 'age') label = 'Age';
                                                                if (key === 'isLivingWithParents') label = 'Is Living with Parents';

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                                        <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm capitalize break-words">
                                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                ? addressMappings[key][member[key]] || 'N/A'
                                                                                : member[key] || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {formData.numberOfhouseholdMembers > 0 && (
                                        <div className="border-t pt-4">
                                            <h3 className="font-semibold text-base sm:text-lg mb-2">Other Household Members</h3>
                                            {formData.householdComposition
                                                .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                                                .map((member, index) => (
                                                    <div key={`member-${index}`} className="border p-3 sm:p-4 rounded-lg mb-4">
                                                        <h4 className="font-semibold text-sm sm:text-base">Member {index + 1}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                                                                if (key === 'age') label = 'Age';

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                                        <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm capitalize break-words">
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

                                    {formData.childrenCount === 0 && formData.numberOfhouseholdMembers === 0 && (
                                        <p className="text-xs sm:text-sm">No household members or children added.</p>
                                    )}
                                </fieldset>
                            )}

                            {activeConfirmationTab === 'census' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Census Questions</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {[
                                            { key: 'ownsHouse', label: 'Owns House' },
                                            { key: 'isRenting', label: 'Is Renting' },
                                            { key: 'yearsInBarangay', label: 'Years in Barangay Bonbon' },
                                            { key: 'isRegisteredVoter', label: 'Is Registered Voter' },
                                            { key: 'voterPrecinctNo', label: 'Voter’s Precinct Number' },
                                            { key: 'hasOwnComfortRoom', label: 'Has Own Comfort Room (C.R.)' },
                                            { key: 'hasOwnWaterSupply', label: 'Has Own Water Supply' },
                                            { key: 'hasOwnElectricity', label: 'Has Own Electricity' },
                                        ].map(({ key, label }) => (
                                            <div key={key}>
                                                <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm capitalize break-words">
                                                    {formData.census[key] || 'N/A'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between mt-4 space-y-3 sm:space-y-0 sm:space-x-3">
                            <button
                                className="bg-gray-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-md transition duration-150 ease-in-out hover:bg-gray-600 active:bg-gray-700 transform hover:scale-105 active:scale-95 w-full sm:w-auto text-xs sm:text-sm"
                                onClick={handleBack}
                            >
                                Back
                            </button>
                            <button
                                className="bg-blue-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-md transition duration-150 ease-in-out hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105 active:scale-95 w-full sm:w-auto text-xs sm:text-sm"
                                onClick={handleSubmit}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col w-full overflow-hidden">
            <div className="w-full relative">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Resident Profiling</h2>
                <div className="border-b bg-gray-100 flex flex-wrap mt-2">
                    {tabs.map((tab) => (
                        <div
                            key={tab.key}
                            onClick={() => (profileStatus !== 1 && profileStatus !== 4) && setActiveTab(tab.key)}
                            className={`cursor-pointer px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex-shrink-0 ${activeTab === tab.key
                                ? 'border-b-2 border-blue-700 text-blue-700'
                                : 'text-gray-600 hover:text-blue-700'
                                } ${profileStatus === 1 || profileStatus === 4 ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>
                <div className="p-2 sm:p-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderActiveTab()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ResidentProfiling;