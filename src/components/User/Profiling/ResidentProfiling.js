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
import placeholderImage from '../../../img/Placeholder/placeholder.png';

const ResidentProfiling = () => {
    const [activeTab, setActiveTab] = useState('householdForm');
    const [activeConfirmationTab, setActiveConfirmationTab] = useState('householdHead');
    const [formData, setFormData] = useState({
        household: {
            zipCode: '9000',
            region: '100000000',
            province: '104300000',
            city: '104305000',
            barangay: '104305040',
        },
        spouse: null,
        householdComposition: [],
        census: {},
        childrenCount: 0,
        numberOfhouseholdMembers: 0,
    });
    const [signedValidIdUrl, setSignedValidIdUrl] = useState(null);
    const [signedZoneCertUrl, setSignedZoneCertUrl] = useState(null);
    const [signedSpouseValidIdUrl, setSignedSpouseValidIdUrl] = useState(null);
    const [userId, setUserId] = useState(null);
    const [addressMappings, setAddressMappings] = useState({
        region: {},
        province: {},
        city: {},
        barangay: {},
    });
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [profileStatus, setProfileStatus] = useState(null);
    const [rejectionReason, setRejectionReason] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [signedImageUrl, setSignedImageUrl] = useState(placeholderImage);

    const tabs = [
        { key: 'householdForm', label: 'Household Head Form' },
        { key: 'spouseForm', label: 'Spouse Information' },
        { key: 'householdComposition', label: 'Household Composition' },
        { key: 'censusQuestions', label: 'Census Questions' },
        { key: 'confirmation', label: 'Confirmation' },
    ];

    const confirmationTabs = [
        { key: 'householdHead', label: 'Household Head' },
        { key: 'spouse', label: 'Spouse' },
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
                    .select('*, resident_profile_status(status, rejection_reason), spouse_valid_id_url')
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    setFormData({
                        household: {
                            ...data.household,
                            zipCode: data.household?.zipCode || '9000',
                            region: data.household?.region || '100000000',
                            province: data.household?.province || '104300000',
                            city: data.household?.city || '104305000',
                            barangay: data.household?.barangay || '104305040',
                        },
                        spouse: data.spouse
                            ? {
                                ...data.spouse,
                                zipCode: data.spouse?.zipCode || '9000',
                                region: data.spouse?.region || '100000000',
                                province: data.spouse?.province || '104300000',
                                city: data.spouse?.city || '104305000',
                                barangay: data.spouse?.barangay || '104305040',
                            }
                            : null,
                        householdComposition: Array.isArray(data.household_composition)
                            ? data.household_composition
                            : [],
                        census: data.census || {},
                        childrenCount: data.children_count || 0,
                        numberOfhouseholdMembers: data.number_of_household_members || 0,
                    });
                    setProfileStatus(data.resident_profile_status?.status || null);
                    setRejectionReason(data.resident_profile_status?.rejection_reason || null);
                    if (data.resident_profile_status?.status === 2 || data.resident_profile_status?.status === 6) {
                        setIsEditing(true);
                    }

                    // Fetch signed URL for household head image
                    if (data.image_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('householdhead')
                            .createSignedUrl(data.image_url, 7200);
                        if (signedUrlError) {
                            console.error('Error generating signed URL for image:', signedUrlError);
                            setSignedImageUrl(placeholderImage);
                        } else {
                            setSignedImageUrl(signedUrlData.signedUrl);
                        }
                    } else {
                        setSignedImageUrl(placeholderImage);
                    }

                    // Fetch signed URL for valid ID
                    if (data.valid_id_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(data.valid_id_url, 7200);
                        if (signedUrlError) {
                            console.error('Error generating signed URL for valid ID:', signedUrlError);
                            setSignedValidIdUrl(null);
                        } else {
                            setSignedValidIdUrl(signedUrlData.signedUrl);
                        }
                    }

                    // Fetch signed URL for zone certificate
                    if (data.zone_cert_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(data.zone_cert_url, 7200);
                        if (signedUrlError) {
                            console.error('Error generating signed URL for zone certificate:', signedUrlError);
                            setSignedZoneCertUrl(null);
                        } else {
                            setSignedZoneCertUrl(signedUrlData.signedUrl);
                        }
                    }

                    // Fetch signed URL for spouse valid ID
                    if (data.spouse_valid_id_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('validid')
                            .createSignedUrl(data.spouse_valid_id_url, 7200);
                        if (signedUrlError) {
                            console.error('Error generating signed URL for spouse valid ID:', signedUrlError);
                            setSignedSpouseValidIdUrl(null);
                        } else {
                            setSignedSpouseValidIdUrl(signedUrlData.signedUrl);
                        }
                    }
                } else {
                    setFormData({
                        household: {
                            zipCode: '9000',
                            region: '100000000',
                            province: '104300000',
                            city: '104305000',
                            barangay: '104305040',
                        },
                        spouse: null,
                        householdComposition: [],
                        census: {},
                        childrenCount: 0,
                        numberOfhouseholdMembers: 0,
                    });
                    setProfileStatus(null);
                    setRejectionReason(null);
                    setSignedImageUrl(placeholderImage);
                    setSignedValidIdUrl(null);
                    setSignedZoneCertUrl(null);
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

    const handleNext = async (data, nextTab, childrenCount, numberOfhouseholdMembers) => {
        setFormData((prev) => {
            if (activeTab === 'householdForm') {
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
                return prev;
            }
        });

        if (activeTab === 'householdForm' && data.civilStatus !== 'Married') {
            try {
                const { error } = await supabase
                    .from('residents')
                    .update({ spouse: null })
                    .eq('user_id', userId);

                if (error) {
                    console.error('Error clearing spouse data:', error.message);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Failed to clear spouse data: ${error.message}`,
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                }
            } catch (error) {
                console.error('Unexpected error clearing spouse data:', error.message);
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
        }

        if (activeTab === 'householdForm') {
            setActiveTab(data.civilStatus === 'Married' ? 'spouseForm' : 'householdComposition');
        } else if (nextTab) {
            setActiveTab(nextTab);
        } else {
            const currentIndex = tabs.findIndex((t) => t.key === activeTab);
            setActiveTab(tabs[Math.min(currentIndex + 1, tabs.length - 1)].key);
        }
        setActiveConfirmationTab('householdHead');
    };

    const handleBack = () => {
        const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
        if (currentIndex > 0) {
            if (activeTab === 'householdComposition' && formData.household.civilStatus !== 'Married') {
                setActiveTab('householdForm');
            } else {
                setActiveTab(tabs[currentIndex - 1].key);
            }
        }
    };

    const handleSubmit = async () => {
        if (profileStatus === 1) {
            await Swal.fire({
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
            // Validate HouseholdForm
            const requiredHouseholdFields = [
                'firstName',
                'lastName',
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
                'pwdStatus',
            ];
            for (let field of requiredHouseholdFields) {
                if (!formData.household[field]) {
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Household form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('householdForm');
                    return;
                }
            }
            // Validate zone if specific location is selected
            if (
                formData.household.region === '100000000' &&
                formData.household.province === '104300000' &&
                formData.household.city === '104305000' &&
                formData.household.barangay === '104305040' &&
                !formData.household.zone
            ) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Household form is incomplete: Zone is required for Barangay Bonbon',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('householdForm');
                return;
            }
            if (formData.household.pwdStatus === 'YES' && !formData.household.disabilityType) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Household form is incomplete: Type of disability is required',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('householdForm');
                return;
            }
            if (!formData.household.image_url) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Household form is incomplete: Image is required',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('householdForm');
                return;
            }
            if (!formData.household.valid_id_url) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: 'true',
                    position: 'top-end',
                    icon: 'error',
                    title: 'Household form is incomplete: Valid ID is required',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('householdForm');
                return;
            }
            if (formData.household.hasZoneCertificate && !formData.household.zone_cert_url) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Household form is incomplete: Zone certificate is required',
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('householdForm');
                return;
            }

            // Validate SpouseForm (if applicable)
            if (formData.household.civilStatus === 'Married') {
                if (!formData.spouse) {
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Spouse information is required for married status',
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('spouseForm');
                    return;
                }
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
                    'pwdStatus',
                ];
                for (let field of requiredSpouseFields) {
                    if (!formData.spouse[field]) {
                        await loadingSwal.close();
                        await Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: `Spouse form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                            timer: 1500,
                            scrollbarPadding: false,
                            showConfirmButton: false,
                        });
                        setActiveTab('spouseForm');
                        return;
                    }
                }
                if (formData.spouse.pwdStatus === 'Yes' && !formData.spouse.disabilityType) {
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Spouse form is incomplete: Type of disability is required',
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('spouseForm');
                    return;
                }
                if (!formData.spouse.valid_id_url) {
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Spouse form is incomplete: Valid ID is required',
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('spouseForm');
                    return;
                }
            }

            // Validate HouseholdComposition
            if (formData.numberOfhouseholdMembers > 0 || formData.childrenCount > 0) {
                if (!Array.isArray(formData.householdComposition) || formData.householdComposition.length === 0) {
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Household composition is incomplete: At least one member is required',
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('householdComposition');
                    return;
                }
                for (let [index, member] of formData.householdComposition.entries()) {
                    const requiredMemberFields = [
                        'firstName',
                        'lastName',
                        'relation',
                        'gender',
                        'age',
                        'dob',
                        'education',
                        'pwdStatus',
                    ];
                    if (member.relation === 'Son' || member.relation === 'Daughter') {
                        requiredMemberFields.push('isLivingWithParents');
                        if (member.isLivingWithParents === 'No') {
                            requiredMemberFields.push('address', 'region', 'province', 'city', 'barangay', 'zipCode');
                        }
                    }
                    if (member.pwdStatus === 'Yes') {
                        requiredMemberFields.push('disabilityType');
                    }
                    for (let field of requiredMemberFields) {
                        if (!member[field]) {
                            await loadingSwal.close();
                            await Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'error',
                                title: `Household composition is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required for member ${index + 1}`,
                                timer: 1500,
                                scrollbarPadding: false,
                                showConfirmButton: false,
                            });
                            setActiveTab('householdComposition');
                            return;
                        }
                    }
                }
            }

            // Validate CensusQuestions
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
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Census form is incomplete: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
                        timer: 1500,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    setActiveTab('censusQuestions');
                    return;
                }
            }
            if (formData.census.isRegisteredVoter === 'Yes' && !formData.census.voterPrecinctNo) {
                await loadingSwal.close();
                await Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: `Census form is incomplete: Voter's precinct number is required`,
                    timer: 1500,
                    scrollbarPadding: false,
                    showConfirmButton: false,
                });
                setActiveTab('censusQuestions');
                return;
            }

            // Convert text fields to uppercase for household, spouse, householdComposition, and census, excluding URLs and dropdowns
            const convertToUpperCase = (obj) => {
                if (!obj) return obj;
                return Object.keys(obj).reduce((acc, key) => {
                    const isUrlField = ['image_url', 'valid_id_url', 'zone_cert_url'].includes(key);
                    const isDropdownField = [
                        'region',
                        'province',
                        'city',
                        'barangay',
                        'zone',
                        'extension',
                        'gender',
                        'customGender',
                        'civilStatus',
                        'idType',
                        'employmentType',
                        'education',
                        'relation',
                        'isLivingWithParents',
                        'ownsHouse',
                        'isRenting',
                        'isRegisteredVoter',
                        'hasOwnComfortRoom',
                        'hasOwnWaterSupply',
                        'hasOwnElectricity',
                        'pwdStatus',
                        'disabilityType',
                    ].includes(key);
                    const isNonTextField = ['age', 'childrenCount', 'numberOfhouseholdMembers'].includes(key);
                    acc[key] = isUrlField || isDropdownField || isNonTextField ? obj[key] : obj[key]?.toString().toUpperCase() || obj[key];
                    return acc;
                }, {});
            };

            const convertedHousehold = convertToUpperCase(formData.household);
            const convertedSpouse = convertToUpperCase(formData.spouse);
            const convertedHouseholdComposition = formData.householdComposition.map(convertToUpperCase);
            const convertedCensus = convertToUpperCase(formData.census);

            const { data: residentData, error: residentError } = await supabase
                .from('residents')
                .upsert({
                    user_id: userId,
                    household: convertedHousehold,
                    spouse: convertedSpouse,
                    household_composition: convertedHouseholdComposition,
                    census: convertedCensus,
                    children_count: parseInt(formData.childrenCount, 10) || 0,
                    number_of_household_members: parseInt(formData.numberOfhouseholdMembers, 10) || 0,
                    image_url: formData.household.image_url,
                    valid_id_url: formData.household.valid_id_url,
                    zone_cert_url: formData.household.zone_cert_url,
                    spouse_valid_id_url: formData.spouse?.valid_id_url || null,
                },
                    { onConflict: 'user_id' })
                .select()
                .single();

            if (residentError) {
                console.error('Error saving resident data:', residentError);
                await loadingSwal.close();
                await Swal.fire({
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
                .upsert({
                    resident_id: residentData.id,
                    status: newStatus,
                },
                    { onConflict: 'resident_id' });

            if (statusError) {
                console.error('Error setting resident profile status:', statusError);
                await loadingSwal.close();
                await Swal.fire({
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
                try {
                    await axios.post('https://bonbon-experiment.vercel.app/api/email/send-pending', {
                        userId,
                    });
                } catch (emailError) {
                    console.error('Failed to send pending email:', emailError.message);
                    await loadingSwal.close();
                    await Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'warning',
                        title: `Form submitted, but failed to send notification email: ${emailError.message}`,
                        timer: 3000,
                        scrollbarPadding: false,
                        showConfirmButton: false,
                    });
                    return;
                }
            }

            await loadingSwal.close();
            await Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Profile submitted successfully with status: ${newStatus === 5 ? 'Update Approved' : 'Pending'}`,
                timer: 1500,
                scrollbarPadding: false,
                showConfirmButton: false,
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Unexpected error:', error);
            await loadingSwal.close();
            await Swal.fire({
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

        if ((profileStatus === 2 || profileStatus === 6) && !isEditing) {
            return (
                <div className="relative flex flex-col items-center justify-center min-h-[50vh] w-full px-4">
                    <div className="absolute inset-0 bg-orange-100 opacity-50 rounded-lg"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600">
                            {profileStatus === 2 ? 'Profile Rejected' : 'Update Profiling Requested'}
                        </h2>
                        <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-gray-600">
                            {profileStatus === 2
                                ? 'Your resident profile was rejected. You can edit your information and resubmit.'
                                : 'You are requested to update your resident profile. Please edit your information and resubmit.'}
                        </p>
                        {rejectionReason && (
                            <p className="mt-2 text-sm text-gray-600 italic">
                                <span className="font-semibold">Reason:</span> {rejectionReason}
                            </p>
                        )}
                        <button
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105 active:scale-95"
                            onClick={() => {
                                setIsEditing(true);
                                setActiveTab('householdForm');
                            }}
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            );
        }

        if (profileStatus === 4) {
            return (
                <div className="relative flex items-center justify-center min-h-[50vh] w-full px-4">
                    <div className="absolute inset-0 bg-blue-100 opacity-50 rounded-lg"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl sm:text-3xl detectar cambios md:text-4xl font-bold text-blue-600">Update Request Pending</h2>
                        <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-gray-600">
                            Your request to update your resident profile is pending admin approval.
                        </p>
                        {rejectionReason && (
                            <p className="mt-2 text-sm text-gray-600 italic">
                                <span className="font-semibold">Reason:</span> {rejectionReason}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return renderFormTabs();
    };

    const renderFormTabs = () => {
        switch (activeTab) {
            case 'householdForm':
                return (
                    <HouseholdForm
                        data={formData.household}
                        onNext={(data) => handleNext(data)}
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
                                    onClick={() => setActiveConfirmationTab(tab.key)}
                                    className={`cursor-pointer px-3 py-2 text-xs sm:text-sm font-medium flex-shrink-0 ${activeConfirmationTab === tab.key
                                        ? 'border-b-2 border-blue-700 text-blue-700'
                                        : 'text-gray-600 hover:text-blue-700'
                                        }`}
                                >
                                    {tab.label}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeConfirmationTab === 'householdHead' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Household Head</legend>
                                    <div className="mb-4">
                                        <img
                                            src={signedImageUrl}
                                            alt="Household Head"
                                            className="w-32 h-32 object-cover rounded-full mx-auto"
                                            onError={(e) => {
                                                console.error('Failed to load household head image:', signedImageUrl);
                                                e.target.src = placeholderImage;
                                            }}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-center mb-2">Household Head Valid ID</h3>
                                        {signedValidIdUrl && (
                                            formData.household.valid_id_url?.endsWith('.pdf') ? (
                                                <p className="text-sm text-center">Valid ID (PDF): {formData.household.valid_id_url.split('/').pop()}</p>
                                            ) : (
                                                <img
                                                    src={signedValidIdUrl}
                                                    alt="Valid ID"
                                                    className="w-48 h-48 object-contain mx-auto"
                                                    onError={() => setSignedValidIdUrl(null)}
                                                />
                                            )
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        {signedZoneCertUrl && (
                                            (formData.household.zone_cert_url?.endsWith('.pdf') ||
                                                formData.household.zone_cert_url?.endsWith('.doc') ||
                                                formData.household.zone_cert_url?.endsWith('.docx')) ? (
                                                <p className="text-sm text-center">Zone Certificate: {formData.household.zone_cert_url.split('/').pop()}</p>
                                            ) : (
                                                <img
                                                    src={signedZoneCertUrl}
                                                    alt="Zone Certificate"
                                                    className="w-48 h-48 object-contain mx-auto"
                                                    onError={() => setSignedZoneCertUrl(null)}
                                                />
                                            )
                                        )}
                                    </div>
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
                                            'hasZoneCertificate',
                                            'pwdStatus', // Added
                                            'disabilityType', // Added
                                        ].map((key) => {
                                            let label = capitalizeWords(key);
                                            if (key === 'dob') label = 'Date of Birth';
                                            if (key === 'idType') label = 'ID Type';
                                            if (key === 'idNo') label = 'ID Number';
                                            if (key === 'hasZoneCertificate') label = 'Has Zone Certificate';
                                            if (key === 'pwdStatus') label = 'PWD Status';
                                            if (key === 'disabilityType') label = 'Type of Disability';

                                            let displayValue;
                                            if (['region', 'province', 'city', 'barangay'].includes(key)) {
                                                displayValue = addressMappings[key][formData.household[key]] || 'N/A';
                                            } else if (key === 'hasZoneCertificate') {
                                                displayValue = formData.household[key] ? 'Yes' : 'No';
                                            } else {
                                                displayValue = formData.household[key] || 'N/A';
                                            }

                                            if (displayValue !== 'N/A' && typeof displayValue === 'string') {
                                                displayValue = displayValue.toUpperCase();
                                            }

                                            return (
                                                <div key={key}>
                                                    <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                    <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm break-words">
                                                        {displayValue}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            {activeConfirmationTab === 'spouse' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Spouse</legend>
                                    {formData.spouse ? (
                                        <>
                                            <div className="mb-4">
                                                <h3 className="text-sm font-semibold text-center mb-2">Spouse Valid ID</h3>
                                                {signedSpouseValidIdUrl && (
                                                    formData.spouse.valid_id_url?.endsWith('.pdf') ? (
                                                        <p className="text-sm text-center">Valid ID (PDF): {formData.spouse.valid_id_url.split('/').pop()}</p>
                                                    ) : (
                                                        <img
                                                            src={signedSpouseValidIdUrl}
                                                            alt="Spouse Valid ID"
                                                            className="w-48 h-48 object-contain mx-auto"
                                                            onError={() => setSignedSpouseValidIdUrl(null)}
                                                        />
                                                    )
                                                )}
                                            </div>
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
                                                    'pwdStatus', // Added
                                                    'disabilityType', // Added
                                                ].map((key) => {
                                                    let label = capitalizeWords(key);
                                                    if (key === 'dob') label = 'Date of Birth';
                                                    if (key === 'idType') label = 'ID Type';
                                                    if (key === 'idNo') label = 'ID Number';
                                                    if (key === 'pwdStatus') label = 'PWD Status';
                                                    if (key === 'disabilityType') label = 'Type of Disability';

                                                    // Get the display value
                                                    let displayValue = ['region', 'province', 'city', 'barangay'].includes(key)
                                                        ? addressMappings[key][formData.spouse[key]] || 'N/A'
                                                        : formData.spouse[key] || 'N/A';

                                                    // Apply uppercase to all display values (except 'N/A')
                                                    if (displayValue !== 'N/A' && typeof displayValue === 'string') {
                                                        displayValue = displayValue.toUpperCase();
                                                    }

                                                    return (
                                                        <div key={key}>
                                                            <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                            <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm break-words">
                                                                {displayValue}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs sm:text-sm text-gray-600">NO SPOUSE DATA PROVIDED.</p>
                                    )}
                                </fieldset>
                            )}

                            {activeConfirmationTab === 'householdComposition' && (
                                <fieldset className="border p-3 sm:p-4 rounded-lg">
                                    <legend className="font-semibold text-sm sm:text-base">Household Composition</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                                        <div>
                                            <label className="font-medium text-xs sm:text-sm">No. of Children:</label>
                                            <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm">{formData.childrenCount.toString().toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium text-xs sm:text-sm">No. of Other Household Members:</label>
                                            <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm">{formData.numberOfhouseholdMembers.toString().toUpperCase()}</p>
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
                                                                'pwdStatus',
                                                                ...(member.pwdStatus === 'Yes' ? ['disabilityType'] : []),
                                                                ...(member.isLivingWithParents === 'No'
                                                                    ? ['address', 'region', 'province', 'city', 'barangay', 'zipCode', 'zone']
                                                                    : []),
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'customGender') label = 'Custom Gender';
                                                                if (key === 'age') label = 'Age';
                                                                if (key === 'isLivingWithParents') label = 'Is Living with Parents';
                                                                if (key === 'pwdStatus') label = 'PWD Status';
                                                                if (key === 'disabilityType') label = 'Type of Disability';

                                                                // Get the display value
                                                                let displayValue = ['region', 'province', 'city', 'barangay'].includes(key)
                                                                    ? addressMappings[key][member[key]] || 'N/A'
                                                                    : member[key] || 'N/A';

                                                                // Apply uppercase to all display values (except 'N/A')
                                                                if (displayValue !== 'N/A' && typeof displayValue === 'string') {
                                                                    displayValue = displayValue.toUpperCase();
                                                                }

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                                        <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm break-words">
                                                                            {displayValue}
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
                                                                'pwdStatus',
                                                                ...(member.pwdStatus === 'Yes' ? ['disabilityType'] : []),
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'customGender') label = 'Custom Gender';
                                                                if (key === 'age') label = 'Age';
                                                                if (key === 'pwdStatus') label = 'PWD Status';
                                                                if (key === 'disabilityType') label = 'Type of Disability';

                                                                // Get the display value
                                                                let displayValue = member[key] || 'N/A';

                                                                // Apply uppercase to all display values (except 'N/A')
                                                                if (displayValue !== 'N/A' && typeof displayValue === 'string') {
                                                                    displayValue = displayValue.toUpperCase();
                                                                }

                                                                return (
                                                                    <div key={key}>
                                                                        <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                                        <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm break-words">
                                                                            {displayValue}
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
                                        <p className="text-xs sm:text-sm">NO HOUSEHOLD MEMBERS OR CHILDREN ADDED.</p>
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
                                        ].map(({ key, label }) => {
                                            // Get the display value
                                            let displayValue = formData.census[key] || 'N/A';

                                            // Apply uppercase to all display values (except 'N/A')
                                            if (displayValue !== 'N/A' && typeof displayValue === 'string') {
                                                displayValue = displayValue.toUpperCase();
                                            }

                                            return (
                                                <div key={key}>
                                                    <label className="font-medium text-xs sm:text-sm">{label}:</label>
                                                    <p className="p-1 sm:p-2 border rounded text-xs sm:text-sm break-words">
                                                        {displayValue}
                                                    </p>
                                                </div>
                                            );
                                        })}
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
                    {tabs.map((tab) => {
                        const isTabAccessible = () => {
                            if (profileStatus === 1 || profileStatus === 4) return false;
                            if (tab.key === 'householdForm') return true;
                            if (!formData.household || Object.keys(formData.household).length === 0) return false;
                            if (tab.key === 'spouseForm') {
                                return formData.household.civilStatus === 'Married';
                            }
                            if (tab.key === 'householdComposition') {
                                return formData.household.civilStatus !== 'Married' || (formData.spouse && Object.keys(formData.spouse).length > 0);
                            }
                            if (tab.key === 'censusQuestions') {
                                return (
                                    formData.householdComposition !== null &&
                                    (formData.numberOfhouseholdMembers > 0 || formData.childrenCount > 0
                                        ? Array.isArray(formData.householdComposition) && formData.householdComposition.length > 0
                                        : true)
                                );
                            }
                            if (tab.key === 'confirmation') {
                                return (
                                    formData.census &&
                                    Object.keys(formData.census).length > 0 &&
                                    ['ownsHouse', 'isRenting', 'yearsInBarangay', 'isRegisteredVoter', 'hasOwnComfortRoom', 'hasOwnWaterSupply', 'hasOwnElectricity'].every(
                                        (field) => formData.census[field]
                                    ) &&
                                    (formData.census.isRegisteredVoter !== 'Yes' || formData.census.voterPrecinctNo)
                                );
                            }
                            return true;
                        };

                        return (
                            <div
                                key={tab.key}
                                onClick={() => {
                                    if (isTabAccessible()) {
                                        setActiveTab(tab.key);
                                        setIsEditing(true);
                                    } else {
                                        Swal.fire({
                                            toast: true,
                                            position: 'top-end',
                                            icon: 'warning',
                                            title: 'Please complete the previous required forms first',
                                            timer: 1500,
                                            scrollbarPadding: false,
                                            showConfirmButton: false,
                                        });
                                    }
                                }}
                                className={`cursor-pointer px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex-shrink-0 ${activeTab === tab.key ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-600 hover:text-blue-700'
                                    } ${!isTabAccessible() ? 'pointer-events-auto opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {tab.label}
                            </div>
                        );
                    })}
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