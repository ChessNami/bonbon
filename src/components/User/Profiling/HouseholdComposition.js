import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabaseClient';
import {
    getAllRegions,
    getProvincesByRegion,
    getMunicipalitiesByProvince,
    getBarangaysByMunicipality,
} from '@aivangogh/ph-address';

// Utility function to calculate age as a string with appropriate unit
const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    const timeDiff = today - birthDate;

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const months =
        today.getMonth() -
        birthDate.getMonth() +
        (today.getFullYear() - birthDate.getFullYear()) * 12;
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }

    if (hours < 24) {
        return `${hours} hours old`;
    } else if (days < 30) {
        return `${days} days old`;
    } else if (months < 12) {
        return `${months} months old`;
    } else {
        return `${years} years old`;
    }
};

const HouseholdComposition = ({
    data,
    childrenCount,
    numberOfhouseholdMembers,
    onNext,
    onBack,
    userId,
}) => {
    const [children, setChildren] = useState([]);
    const [householdMembers, setHouseholdMembers] = useState([]);
    const [localChildrenCount, setLocalChildrenCount] = useState(childrenCount || 0);
    const [localNumberOfhouseholdMembers, setLocalNumberOfhouseholdMembers] = useState(
        numberOfhouseholdMembers || 0
    );
    const [householdHeadAddress, setHouseholdHeadAddress] = useState({});
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState({});
    const [cities, setCities] = useState({});
    const [barangays, setBarangays] = useState({});

    // Fetch household composition and household head address from Supabase
    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.log('No userId provided, skipping fetch.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('residents')
                .select('household_composition, children_count, number_of_household_members, household')
                .eq('user_id', userId)
                .single();

            if (data && !error) {
                const composition = Array.isArray(data.household_composition)
                    ? data.household_composition
                    : [];
                const childMembers = composition
                    .filter((member) => member.relation === 'Son' || member.relation === 'Daughter')
                    .map((member) => ({
                        ...member,
                        age: member.dob ? calculateAge(member.dob) : member.age || '',
                        isLivingWithParents: member.isLivingWithParents || 'Yes',
                        pwdStatus: member.pwdStatus || '',
                        disabilityType: member.disabilityType || '',
                    }));
                const otherMembers = composition
                    .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                    .map((member) => ({
                        ...member,
                        age: member.dob ? calculateAge(member.dob) : member.age || '',
                        pwdStatus: member.pwdStatus || '',
                        disabilityType: member.disabilityType || '',
                    }));
                setChildren(childMembers);
                setHouseholdMembers(otherMembers);
                setLocalChildrenCount(data.children_count || 0);
                setLocalNumberOfhouseholdMembers(data.number_of_household_members || 0);
                setHouseholdHeadAddress(data.household || {});
            } else if (error) {
                console.error('Error fetching household composition:', error);
                setChildren([]);
                setHouseholdMembers([]);
                setLocalChildrenCount(0);
                setLocalNumberOfhouseholdMembers(0);
                setHouseholdHeadAddress({});
            }
        } catch (error) {
            console.error('Unexpected error fetching data:', error);
        }
    }, [userId]);

    useEffect(() => {
        setRegions(getAllRegions());
        fetchUserData();
    }, [fetchUserData]);

    // Update address dropdowns for each child
    useEffect(() => {
        const updatedProvinces = {};
        const updatedCities = {};
        const updatedBarangays = {};

        children.forEach((child, index) => {
            if (child.isLivingWithParents === 'No' && child.region) {
                updatedProvinces[index] = getProvincesByRegion(child.region);
            }
            if (child.isLivingWithParents === 'No' && child.province) {
                updatedCities[index] = getMunicipalitiesByProvince(child.province);
            }
            if (child.isLivingWithParents === 'No' && child.city) {
                updatedBarangays[index] = getBarangaysByMunicipality(child.city);
            }
        });

        setProvinces(updatedProvinces);
        setCities(updatedCities);
        setBarangays(updatedBarangays);
    }, [children]);

    // Update children list based on localChildrenCount
    useEffect(() => {
        if (localChildrenCount) {
            setChildren((prev) => {
                const currentMembers = Array.isArray(prev) ? prev : [];
                const newChildren = [...currentMembers];
                while (newChildren.length < localChildrenCount) {
                    newChildren.push({
                        firstName: '',
                        lastName: '',
                        middleName: '',
                        middleInitial: '',
                        relation: 'Son',
                        gender: 'Male',
                        customGender: '',
                        age: '',
                        dob: '',
                        education: '',
                        occupation: '',
                        isLivingWithParents: 'Yes',
                        address: householdHeadAddress.address || '',
                        region: householdHeadAddress.region || '',
                        province: householdHeadAddress.province || '',
                        city: householdHeadAddress.city || '',
                        barangay: householdHeadAddress.barangay || '',
                        zipCode: householdHeadAddress.zipCode || '',
                        zone: householdHeadAddress.zone || '',
                        pwdStatus: '',
                        disabilityType: '',
                    });
                }
                return newChildren.slice(0, localChildrenCount).map((child) => ({
                    ...child,
                    age: child.dob ? calculateAge(child.dob) : child.age || '',
                    address: child.isLivingWithParents === 'Yes' ? householdHeadAddress.address || '' : child.address || '',
                    region: child.isLivingWithParents === 'Yes' ? householdHeadAddress.region || '' : child.region || '',
                    province: child.isLivingWithParents === 'Yes' ? householdHeadAddress.province || '' : child.province || '',
                    city: child.isLivingWithParents === 'Yes' ? householdHeadAddress.city || '' : child.city || '',
                    barangay: child.isLivingWithParents === 'Yes' ? householdHeadAddress.barangay || '' : child.barangay || '',
                    zipCode: child.isLivingWithParents === 'Yes' ? householdHeadAddress.zipCode || '' : child.zipCode || '',
                    zone: child.isLivingWithParents === 'Yes' ? householdHeadAddress.zone || '' : child.zone || '',
                    pwdStatus: child.pwdStatus || '',
                    disabilityType: child.disabilityType || '',
                }));
            });
        } else {
            setChildren([]);
        }
    }, [localChildrenCount, householdHeadAddress]);

    // Update household members list based on localNumberOfhouseholdMembers
    useEffect(() => {
        if (localNumberOfhouseholdMembers) {
            setHouseholdMembers((prev) => {
                const currentMembers = Array.isArray(prev) ? prev : [];
                const newHousehold = [...currentMembers];
                while (newHousehold.length < localNumberOfhouseholdMembers) {
                    newHousehold.push({
                        firstName: '',
                        lastName: '',
                        middleName: '',
                        middleInitial: '',
                        relation: '',
                        gender: '',
                        customGender: '',
                        age: '',
                        dob: '',
                        education: '',
                        occupation: '',
                        pwdStatus: '',
                        disabilityType: '',
                    });
                }
                return newHousehold.slice(0, localNumberOfhouseholdMembers).map((member) => ({
                    ...member,
                    age: member.dob ? calculateAge(member.dob) : member.age || '',
                    pwdStatus: member.pwdStatus || '',
                    disabilityType: member.disabilityType || '',
                }));
            });
        } else {
            setHouseholdMembers([]);
        }
    }, [localNumberOfhouseholdMembers]);

    const handleChildrenCountChange = (e) => {
        const value = e.target.value;
        // Parse the input value, allowing empty string for user typing
        const parsedValue = value === '' ? 0 : parseInt(value, 10) || 0;
        const count = Math.max(0, Math.min(40, parsedValue));

        if (parsedValue > 40) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Maximum of 40 children allowed.',
                timer: 1500,
                showConfirmButton: false,
            });
        }

        setLocalChildrenCount(count);
    };

    const handleHouseholdChange = (e) => {
        const value = e.target.value;
        // Parse the input value, allowing empty string for user typing
        const parsedValue = value === '' ? 0 : parseInt(value, 10) || 0;
        const count = Math.max(0, Math.min(60, parsedValue));

        if (parsedValue > 60) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Maximum of 60 other household members allowed.',
                timer: 1500,
                showConfirmButton: false,
            });
        }

        setLocalNumberOfhouseholdMembers(count);
    };

    const handleChildChange = (index, e) => {
        const { name, value } = e.target;

        setChildren((prev) => {
            const updatedChildren = Array.isArray(prev) ? [...prev] : [];
            const child = { ...updatedChildren[index] };

            // === 1. Determine value transformation ===
            const isDropdown = [
                'relation', 'gender', 'customGender', 'education',
                'isLivingWithParents', 'region', 'province', 'city',
                'barangay', 'zone', 'pwdStatus', 'disabilityType'
            ].includes(name);

            const isNumeric = ['zipCode'].includes(name);

            let finalValue;
            if (isDropdown) {
                finalValue = value;
            } else if (isNumeric) {
                finalValue = value.replace(/[^0-9]/g, '').slice(0, 4);
            } else {
                finalValue = value.toUpperCase();
            }

            // === 2. Update field ===
            child[name] = finalValue;

            // === 3. Auto-fill logic ===
            if (name === 'middleName') {
                const trimmed = finalValue.trim();
                child.middleInitial = trimmed ? trimmed.charAt(0) + '.' : '';
            }

            if (name === 'relation') {
                if (value === 'Son') child.gender = 'Male';
                else if (value === 'Daughter') child.gender = 'Female';
                if (value !== 'Other') child.customGender = '';
            }

            if (name === 'dob') {
                child.age = calculateAge(value);
            }

            if (name === 'pwdStatus') {
                child.disabilityType = value === 'No' ? '' : child.disabilityType;
            }

            if (name === 'isLivingWithParents') {
                if (value === 'Yes') {
                    const addr = householdHeadAddress;
                    child.address = (addr.address || '').toUpperCase();
                    child.region = addr.region || '';
                    child.province = addr.province || '';
                    child.city = addr.city || '';
                    child.barangay = addr.barangay || '';
                    child.zipCode = addr.zipCode || '';
                    child.zone = addr.zone || '';
                } else {
                    child.address = '';
                    child.region = '';
                    child.province = '';
                    child.city = '';
                    child.barangay = '';
                    child.zipCode = '';
                    child.zone = '';
                }
            }

            // === 4. Address cascade ===
            if (name === 'region') {
                setProvinces(prev => ({ ...prev, [index]: getProvincesByRegion(value) }));
                child.province = '';
                child.city = '';
                child.barangay = '';
                setCities(prev => ({ ...prev, [index]: [] }));
                setBarangays(prev => ({ ...prev, [index]: [] }));
            }

            if (name === 'province') {
                setCities(prev => ({ ...prev, [index]: getMunicipalitiesByProvince(value) }));
                child.city = '';
                child.barangay = '';
                setBarangays(prev => ({ ...prev, [index]: [] }));
            }

            if (name === 'city') {
                setBarangays(prev => ({ ...prev, [index]: getBarangaysByMunicipality(value) }));
                child.barangay = '';
            }

            // === 5. Zip code validation toast ===
            if (name === 'zipCode' && finalValue && !/^\d{4}$/.test(finalValue)) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Zip code must be 4 digits',
                    timer: 1500,
                    showConfirmButton: false,
                });
            }

            updatedChildren[index] = child;
            return updatedChildren;
        });
    };

    // ========================================
    // HOUSEHOLD MEMBER CHANGE
    // ========================================
    const handleMemberChange = (index, e) => {
        const { name, value } = e.target;

        setHouseholdMembers((prev) => {
            const updatedMembers = Array.isArray(prev) ? [...prev] : [];
            const member = { ...updatedMembers[index] };

            const isDropdown = [
                'relation', 'gender', 'customGender', 'education',
                'pwdStatus', 'disabilityType'
            ].includes(name);

            const finalValue = isDropdown ? value : value.toUpperCase();
            member[name] = finalValue;

            if (name === 'middleName') {
                const trimmed = finalValue.trim();
                member.middleInitial = trimmed ? trimmed.charAt(0) + '.' : '';
            }

            if (name === 'dob') {
                member.age = calculateAge(value);
            }

            if (name === 'pwdStatus') {
                member.disabilityType = value === 'No' ? '' : member.disabilityType;
            }

            updatedMembers[index] = member;
            return updatedMembers;
        });
    };

    // ========================================
    // GENDER CHANGE (OTHER → customGender)
    // ========================================
    const handleChildGenderChange = (index, e) => {
        const value = e.target.value;
        setChildren((prev) => {
            const updated = Array.isArray(prev) ? [...prev] : [];
            updated[index] = {
                ...updated[index],
                gender: value,
                customGender: value !== 'Other' ? '' : updated[index].customGender
            };
            return updated;
        });
    };

    const handleMemberGenderChange = (index, e) => {
        const value = e.target.value;
        setHouseholdMembers((prev) => {
            const updated = Array.isArray(prev) ? [...prev] : [];
            updated[index] = {
                ...updated[index],
                gender: value,
                customGender: value !== 'Other' ? '' : updated[index].customGender
            };
            return updated;
        });
    };

    // Handle form submission
    const handleSubmit = async () => {
        const allMembers = [...children, ...householdMembers];
        if (allMembers.length > 0) {
            for (let member of allMembers) {
                const requiredFields = ['firstName', 'lastName', 'relation', 'gender', 'age', 'dob', 'education', 'pwdStatus'];
                if (member.relation === 'Son' || member.relation === 'Daughter') {
                    requiredFields.push('isLivingWithParents');
                    if (member.isLivingWithParents === 'No') {
                        requiredFields.push('address', 'region', 'province', 'city', 'barangay', 'zipCode');
                    }
                }
                if (member.pwdStatus === 'Yes') {
                    requiredFields.push('disabilityType');
                }
                for (let field of requiredFields) {
                    if (!member[field]) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: `Please fill in the required field: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} for ${member.firstName} ${member.lastName}`,
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        return;
                    }
                }
                // Validate age string format
                if (!/^\d+\s*(hours|days|months|years)\s*old$/.test(member.age)) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Please provide a valid age for ${member.firstName} ${member.lastName} (e.g., "5 days old")`,
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    return;
                }
                // Validate zipCode if required
                if (member.isLivingWithParents === 'No' && member.zipCode && !/^[0-9]{4}$/.test(member.zipCode)) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: `Please provide a valid 4-digit zip code for ${member.firstName} ${member.lastName}`,
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    return;
                }
            }
        }

        // Convert text fields to uppercase, excluding dropdowns and non-text fields
        const convertToUpperCase = (obj) => {
            if (!obj) return null;
            return Object.keys(obj).reduce((acc, key) => {
                const isDropdownField = [
                    'relation',
                    'gender',
                    'customGender',
                    'education',
                    'isLivingWithParents',
                    'region',
                    'province',
                    'city',
                    'barangay',
                    'zone',
                    'pwdStatus',
                    'disabilityType',
                ].includes(key);
                const isNonTextField = ['age', 'dob'].includes(key);
                acc[key] = isDropdownField || isNonTextField ? obj[key] : obj[key]?.toString().toUpperCase() || '';
                return acc;
            }, {});
        };

        const convertedMembers = allMembers.map(convertToUpperCase);

        const { error } = await supabase
            .from('residents')
            .update({
                household_composition: convertedMembers,
                children_count: parseInt(localChildrenCount, 10) || 0,
                number_of_household_members: parseInt(localNumberOfhouseholdMembers, 10) || 0,
            })
            .eq('user_id', userId);

        if (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: `Failed to save data: ${error.message}`,
                timer: 1500,
                showConfirmButton: false,
            });
            return;
        }

        onNext(convertedMembers, 'confirmation', localChildrenCount, localNumberOfhouseholdMembers);
    };

    const handleBackClick = (e) => {
        e.preventDefault();
        if (onBack) onBack();
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 shadow-lg rounded-lg max-w-4xl mx-auto">
            <form className="space-y-4 sm:space-y-6">
                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Household Composition</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                No. of Children <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="childrenCount"
                                className="input-style text-sm sm:text-base"
                                value={localChildrenCount === 0 ? '' : localChildrenCount}
                                onChange={handleChildrenCountChange}
                                min="0"
                                max="40"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                No. of Other Household Members <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="numberOfhouseholdMembers"
                                className="input-style text-sm sm:text-base"
                                value={localNumberOfhouseholdMembers === 0 ? '' : localNumberOfhouseholdMembers}
                                onChange={handleHouseholdChange}
                                min="0"
                                max="60"
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                {Array.isArray(children) && children.length > 0 && (
                    <fieldset className="border p-3 sm:p-4 rounded-lg">
                        <legend className="font-semibold text-sm sm:text-base">Children Composition</legend>
                        {children.map((child, index) => (
                            <fieldset key={`child-${index}`} className="border p-3 sm:p-4 rounded-lg mt-4">
                                <legend className="font-semibold text-sm sm:text-base">Child {index + 1}</legend>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            className="input-style text-sm sm:text-base"
                                            value={child.firstName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            className="input-style text-sm sm:text-base"
                                            value={child.lastName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Middle Name</label>
                                        <input
                                            type="text"
                                            name="middleName"
                                            className="input-style text-sm sm:text-base"
                                            style={{ textTransform: 'uppercase' }}
                                            value={child.middleName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Middle Initial</label>
                                        <input
                                            type="text"
                                            name="middleInitial"
                                            className="input-style text-sm sm:text-base"
                                            value={child.middleInitial || ''}
                                            style={{ textTransform: 'uppercase' }}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Relation <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="relation"
                                            className="input-style text-sm sm:text-base"
                                            value={child.relation || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="Son">Son</option>
                                            <option value="Daughter">Daughter</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="gender"
                                            className="input-style text-sm sm:text-base"
                                            value={child.gender || ''}
                                            onChange={(e) => handleChildGenderChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="Male" disabled={child.relation !== 'Son'}>Male</option>
                                            <option value="Female" disabled={child.relation !== 'Daughter'}>Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {child.gender === 'Other' && (
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium">Specify Gender</label>
                                            <input
                                                type="text"
                                                name="customGender"
                                                className="input-style text-sm sm:text-base"
                                                style={{ textTransform: 'uppercase' }}
                                                value={child.customGender || ''}
                                                onChange={(e) => handleChildChange(index, e)}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Date of Birth <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            className="input-style text-sm sm:text-base"
                                            value={child.dob || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Age <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="age"
                                            className="input-style text-sm sm:text-base"
                                            value={child.age || ''}
                                            disabled
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Education <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="education"
                                            className="input-style text-sm sm:text-base"
                                            value={child.education || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="Elementary Level">Elementary Level</option>
                                            <option value="Elementary Graduate">Elementary Graduate</option>
                                            <option value="High School Level">High School Level</option>
                                            <option value="High School Graduate">High School Graduate</option>
                                            <option value="College">College</option>
                                            <option value="College Graduate">College Graduate</option>
                                            <option value="Masteral">Master's Degree</option>
                                            <option value="Double Masteral">Double Master's Degree</option>
                                            <option value="Vocational">Vocational</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Occupation</label>
                                        <input
                                            type="text"
                                            name="occupation"
                                            className="input-style text-sm sm:text-base"
                                            style={{ textTransform: 'uppercase' }}
                                            value={child.occupation || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            PWD Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="pwdStatus"
                                            className="input-style text-sm sm:text-base"
                                            value={child.pwdStatus || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    {child.pwdStatus === 'Yes' && (
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium">
                                                Type of Disability <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="disabilityType"
                                                className="input-style text-sm sm:text-base"
                                                value={child.disabilityType || ''}
                                                onChange={(e) => handleChildChange(index, e)}
                                                style={{ textTransform: 'uppercase' }}
                                                required
                                            >
                                                <option value="">Select</option>
                                                <option value="Physical Disability">Physical Disability</option>
                                                <option value="Visual Impairment">Visual Impairment</option>
                                                <option value="Hearing Impairment">Hearing Impairment</option>
                                                <option value="Intellectual Disability">Intellectual Disability</option>
                                                <option value="Psychosocial Disability">Psychosocial Disability</option>
                                                <option value="Speech Impairment">Speech Impairment</option>
                                                <option value="Multiple Disabilities">Multiple Disabilities</option>
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Is Living with Parent/s? <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="isLivingWithParents"
                                            className="input-style text-sm sm:text-base"
                                            value={child.isLivingWithParents || 'Yes'}
                                            onChange={(e) => handleChildChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    {child.isLivingWithParents === 'No' && (
                                        <>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    Address <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.address || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    style={{ textTransform: 'uppercase' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    Region <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="region"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.region || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    style={{ textTransform: 'uppercase' }}
                                                    required
                                                >
                                                    <option value="">Select</option>
                                                    {regions.map((region) => (
                                                        <option key={region.psgcCode} value={region.psgcCode}>
                                                            {region.designation} - {region.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    Province <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="province"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.province || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    style={{ textTransform: 'uppercase' }}
                                                    required
                                                >
                                                    <option value="">Select</option>
                                                    {(provinces[index] || []).map((province) => (
                                                        <option key={province.psgcCode} value={province.psgcCode}>
                                                            {province.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    City <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="city"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.city || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    style={{ textTransform: 'uppercase' }}
                                                    required
                                                >
                                                    <option value="">Select</option>
                                                    {(cities[index] || []).map((city) => (
                                                        <option key={city.psgcCode} value={city.psgcCode}>
                                                            {city.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    Barangay <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="barangay"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.barangay || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    style={{ textTransform: 'uppercase' }}
                                                    required
                                                >
                                                    <option value="">Select</option>
                                                    {(barangays[index] || []).map((barangay) => (
                                                        <option key={barangay.psgcCode} value={barangay.psgcCode}>
                                                            {barangay.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium">
                                                    Zip Code <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="zipCode"
                                                    className="input-style text-sm sm:text-base"
                                                    value={child.zipCode || ''}
                                                    onChange={(e) => handleChildChange(index, e)}
                                                    required
                                                />
                                            </div>
                                            {child.region === '100000000' &&
                                                child.province === '104300000' &&
                                                child.city === '104305000' &&
                                                child.barangay === '104305040' && (
                                                    <div>
                                                        <label className="block text-xs sm:text-sm font-medium">Zone#</label>
                                                        <select
                                                            name="zone"
                                                            className="input-style text-sm sm:text-base"
                                                            value={child.zone || ''}
                                                            onChange={(e) => handleChildChange(index, e)}
                                                        >
                                                            <option value="">Select</option>
                                                            {[...Array(9)].map((_, i) => (
                                                                <option key={i + 1} value={`Zone ${i + 1}`}>
                                                                    Zone {i + 1}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                        </>
                                    )}
                                </div>
                            </fieldset>
                        ))}
                    </fieldset>
                )}

                {Array.isArray(householdMembers) && householdMembers.length > 0 && (
                    <fieldset className="border p-3 sm:p-4 rounded-lg">
                        <legend className="font-semibold text-sm sm:text-base">Other Household Members</legend>
                        {householdMembers.map((member, index) => (
                            <fieldset key={`member-${index}`} className="border p-3 sm:p-4 rounded-lg mt-4">
                                <legend className="font-semibold text-sm sm:text-base">Household Member {index + 1}</legend>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            className="input-style text-sm sm:text-base"
                                            value={member.firstName || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            className="input-style text-sm sm:text-base"
                                            value={member.lastName || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Middle Name</label>
                                        <input
                                            type="text"
                                            name="middleName"
                                            className="input-style text-sm sm:text-base"
                                            style={{ textTransform: 'uppercase' }}
                                            value={member.middleName || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Middle Initial</label>
                                        <input
                                            type="text"
                                            name="middleInitial"
                                            className="input-style text-sm sm:text-base"
                                            value={member.middleInitial || ''}
                                            style={{ textTransform: 'uppercase' }}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Relation <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="relation"
                                            className="input-style text-sm sm:text-base"
                                            value={member.relation || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="Father">Father</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Brother">Brother</option>
                                            <option value="Sister">Sister</option>
                                            <option value="Grandfather">Grandfather</option>
                                            <option value="Grandmother">Grandmother</option>
                                            <option value="Grandson">Grandson</option>
                                            <option value="Granddaughter">Granddaughter</option>
                                            <option value="Uncle">Uncle</option>
                                            <option value="Aunt">Aunt</option>
                                            <option value="Nephew">Nephew</option>
                                            <option value="Niece">Niece</option>
                                            <option value="Cousin">Cousin</option>
                                            <option value="Guardian">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="gender"
                                            className="input-style text-sm sm:text-base"
                                            value={member.gender || ''}
                                            onChange={(e) => handleMemberGenderChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {member.gender === 'Other' && (
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium">Specify Gender</label>
                                            <select
                                                name="customGender"
                                                className="input-style text-sm sm:text-base"
                                                style={{ textTransform: 'uppercase' }}
                                                value={member.customGender || ''}
                                                onChange={(e) => handleMemberChange(index, e)}
                                            >
                                                <option value="">Select</option>
                                                <option value="Non-Binary">Non-Binary</option>
                                                <option value="Transgender">Transgender</option>
                                                <option value="Genderqueer">Genderqueer</option>
                                                <option value="Agender">Agender</option>
                                                <option value="Genderfluid">Genderfluid</option>
                                                <option value="Two-Spirit">Two-Spirit</option>
                                                <option value="Bigender">Bigender</option>
                                                <option value="Demigender">Demigender</option>
                                                <option value="Androgynous">Androgynous</option>
                                                <option value="Pangender">Pangender</option>
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Date of Birth <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="dob"
                                            className="input-style text-sm sm:text-base"
                                            value={member.dob || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Age <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="age"
                                            className="input-style text-sm sm:text-base"
                                            value={member.age || ''}
                                            disabled
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            Education <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="education"
                                            className="input-style text-sm sm:text-base"
                                            value={member.education || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="Elementary Level">Elementary Level</option>
                                            <option value="Elementary Graduate">Elementary Graduate</option>
                                            <option value="High School Level">High School Level</option>
                                            <option value="High School Graduate">High School Graduate</option>
                                            <option value="College">College</option>
                                            <option value="College Graduate">College Graduate</option>
                                            <option value="Masteral">Master's Degree</option>
                                            <option value="Double Masteral">Double Master's Degree</option>
                                            <option value="Vocational">Vocational</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">Occupation</label>
                                        <input
                                            type="text"
                                            name="occupation"
                                            className="input-style text-sm sm:text-base"
                                            style={{ textTransform: 'uppercase' }}
                                            value={member.occupation || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium">
                                            PWD Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="pwdStatus"
                                            className="input-style text-sm sm:text-base"
                                            value={member.pwdStatus || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            style={{ textTransform: 'uppercase' }}
                                            required
                                        >
                                            <option value="">Select</option>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    {member.pwdStatus === 'Yes' && (
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium">
                                                Type of Disability <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="disabilityType"
                                                className="input-style text-sm sm:text-base"
                                                value={member.disabilityType || ''}
                                                onChange={(e) => handleMemberChange(index, e)}
                                                style={{ textTransform: 'uppercase' }}
                                                required
                                            >
                                                <option value="">Select</option>
                                                <option value="Physical Disability">Physical Disability</option>
                                                <option value="Visual Impairment">Visual Impairment</option>
                                                <option value="Hearing Impairment">Hearing Impairment</option>
                                                <option value="Intellectual Disability">Intellectual Disability</option>
                                                <option value="Psychosocial Disability">Psychosocial Disability</option>
                                                <option value="Speech Impairment">Speech Impairment</option>
                                                <option value="Multiple Disabilities">Multiple Disabilities</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </fieldset>
                        ))}
                    </fieldset>
                )}

                <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
                    <button
                        type="button"
                        className="bg-gray-500 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-gray-600 active:bg-gray-700 text-sm sm:text-base w-full sm:w-auto transform hover:scale-105 active:scale-95"
                        onClick={handleBackClick}
                    >
                        Back
                    </button>
                    {/* <button
                        type="button"
                        className="bg-red-600 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-red-700 active:bg-red-800 text-sm sm:text-base w-full sm:w-auto transform hover:scale-105 active:scale-95"
                        onClick={async () => {
                            try {
                                // Check if household composition data exists
                                const { data: residentData, error: fetchError } = await supabase
                                    .from('residents')
                                    .select('household_composition, children_count, number_of_household_members')
                                    .eq('user_id', userId)
                                    .maybeSingle(); // Use maybeSingle to handle no rows gracefully

                                if (fetchError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error checking household composition data: ${fetchError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // If no resident data or no household composition data exists
                                if (
                                    !residentData ||
                                    (!residentData.household_composition &&
                                        residentData.children_count === 0 &&
                                        residentData.number_of_household_members === 0)
                                ) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'info',
                                        title: 'No household composition data to clear',
                                        text: 'The household composition is already empty.',
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Confirm deletion if data exists
                                const result = await Swal.fire({
                                    title: 'Are you sure?',
                                    text: 'This will clear all household composition data, including children and other household members. This action cannot be undone.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'Yes, clear it!',
                                    scrollbarPadding: false,
                                });

                                if (!result.isConfirmed) return;

                                // Clear household composition data
                                const { error: updateError } = await supabase
                                    .from('residents')
                                    .update({
                                        household_composition: null,
                                        children_count: 0,
                                        number_of_household_members: 0,
                                    })
                                    .eq('user_id', userId);

                                if (updateError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error clearing household composition data: ${updateError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Reset form state
                                setChildren([]);
                                setHouseholdMembers([]);
                                setLocalChildrenCount(0);
                                setLocalNumberOfhouseholdMembers(0);
                                setProvinces({});
                                setCities({});
                                setBarangays({});

                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'success',
                                    title: 'Household composition data cleared successfully',
                                    timer: 1500,
                                    showConfirmButton: false,
                                    scrollbarPadding: false,
                                });
                            } catch (error) {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'error',
                                    title: `Unexpected error: ${error.message}`,
                                    timer: 1500,
                                    showConfirmButton: false,
                                    scrollbarPadding: false,
                                });
                            }
                        }}
                    >
                        Clear Data
                    </button> */}
                    <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-blue-700 active:bg-blue-800 text-sm sm:text-base w-full sm:w-auto transform hover:scale-105 active:scale-95"
                        onClick={handleSubmit}
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
};

HouseholdComposition.propTypes = {
    data: PropTypes.array,
    childrenCount: PropTypes.number,
    numberOfhouseholdMembers: PropTypes.number,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    userId: PropTypes.string,
};

export default HouseholdComposition;