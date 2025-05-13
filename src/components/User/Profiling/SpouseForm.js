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

// Utility function to calculate age from date of birth
const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 0 ? age : '';
};

const SpouseForm = ({ data, onNext, onBack, userId }) => {
    // Initialize form state with calculated age if DOB exists
    const [formData, setFormData] = useState({
        ...data,
        age: data?.dob ? calculateAge(data.dob) : data?.age || '',
    });
    const [isDirty, setIsDirty] = useState(false); // Track if form has unsaved changes
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [gender, setGender] = useState(data?.gender || '');
    const [customGender, setCustomGender] = useState(data?.customGender || '');
    const [employmentType, setEmploymentType] = useState(data?.employmentType || '');

    // Fetch spouse data from Supabase
    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.log('No userId provided, skipping fetch.');
            return;
        }

        const { data: residentData, error } = await supabase
            .from('residents')
            .select('spouse')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching spouse data:', error.message);
            return;
        }

        if (residentData?.spouse && !isDirty) {
            const spouseData = {
                ...residentData.spouse,
                age: residentData.spouse.dob
                    ? calculateAge(residentData.spouse.dob)
                    : residentData.spouse.age || '',
            };
            setFormData(spouseData);
            setGender(residentData.spouse.gender || '');
            setCustomGender(residentData.spouse.customGender || '');
            setEmploymentType(residentData.spouse.employmentType || '');
        }
    }, [userId, isDirty]);

    // Load regions and fetch user data on mount
    useEffect(() => {
        setRegions(getAllRegions());
        fetchUserData();

        if (data?.civilStatus === 'Married') {
            setFormData((prev) => ({ ...prev, civilStatus: 'Married' }));
        }
    }, [data, fetchUserData]);

    // Update address dropdowns when region, province, or city changes
    useEffect(() => {
        if (formData.region) setProvinces(getProvincesByRegion(formData.region));
        if (formData.province) setCities(getMunicipalitiesByProvince(formData.province));
        if (formData.city) setBarangays(getBarangaysByMunicipality(formData.city));
    }, [formData.region, formData.province, formData.city]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setIsDirty(true); // Mark form as dirty on any change
        setFormData((prev) => {
            const updatedData = { ...prev, [name]: value };
            if (name === 'middleName') {
                updatedData.middleInitial = value ? value.charAt(0).toUpperCase() : '';
            }
            if (name === 'dob') {
                updatedData.age = calculateAge(value);
            }
            return updatedData;
        });

        // Update address dropdowns
        if (name === 'region') {
            setProvinces(getProvincesByRegion(value));
            setCities([]);
            setBarangays([]);
        } else if (name === 'province') {
            setCities(getMunicipalitiesByProvince(value));
            setBarangays([]);
        } else if (name === 'city') {
            setBarangays(getBarangaysByMunicipality(value));
        }
    };

    const handleGenderChange = (e) => {
        const value = e.target.value;
        setGender(value);
        setIsDirty(true);
        if (value !== 'Other') setCustomGender('');
        handleChange(e);
    };

    const handleEmploymentChange = (e) => {
        setEmploymentType(e.target.value);
        setIsDirty(true);
        handleChange(e);
    };

    // Handle form submission
    const handleSubmit = async () => {
        const requiredFields = [
            'firstName',
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
        ];

        for (const field of requiredFields) {
            if (!formData[field]) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: `Please fill in the required field: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
                    timer: 1500,
                    showConfirmButton: false,
                });
                return;
            }
        }

        const updatedData = {
            ...formData,
            gender,
            customGender: gender === 'Other' ? customGender : '',
            employmentType,
        };

        const { error } = await supabase
            .from('residents')
            .update({ spouse: updatedData })
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

        setIsDirty(false); // Reset dirty state after saving
        onNext(updatedData, 'householdComposition');
    };

    const handleBackClick = (e) => {
        e.preventDefault();
        onBack?.();
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 shadow-lg rounded-lg max-w-4xl mx-auto">
            <form className="space-y-4 sm:space-y-6">
                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Name of Spouse</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                className="input-style text-sm sm:text-base"
                                value={formData.firstName || ''}
                                onChange={handleChange}
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
                                value={formData.lastName || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">Middle Name</label>
                            <input
                                type="text"
                                name="middleName"
                                className="input-style text-sm sm:text-base"
                                value={formData.middleName || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">Middle Initial</label>
                            <input
                                type="text"
                                name="middleInitial"
                                className="input-style text-sm sm:text-base"
                                value={formData.middleInitial || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">Extension</label>
                            <select
                                name="extension"
                                className="input-style text-sm sm:text-base"
                                value={formData.extension || ''}
                                onChange={handleChange}
                            >
                                <option value="">Select</option>
                                <option value="Jr.">Jr.</option>
                                <option value="Sr.">Sr.</option>
                                <option value="I">I</option>
                                <option value="II">II</option>
                                <option value="III">III</option>
                                <option value="IV">IV</option>
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Address</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="address"
                                className="input-style text-sm sm:text-base"
                                value={formData.address || ''}
                                onChange={handleChange}
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
                                value={formData.region || ''}
                                onChange={handleChange}
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
                                value={formData.province || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                {provinces.map((province) => (
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
                                value={formData.city || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                {cities.map((city) => (
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
                                value={formData.barangay || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                {barangays.map((barangay) => (
                                    <option key={barangay.psgcCode} value={barangay.psgcCode}>
                                        {barangay.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {formData.region === '100000000' &&
                            formData.province === '104300000' &&
                            formData.city === '104305000' &&
                            formData.barangay === '104305040' && (
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium">Zone#</label>
                                    <select
                                        name="zone"
                                        className="input-style text-sm sm:text-base"
                                        value={formData.zone || ''}
                                        onChange={handleChange}
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
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Zip Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="zipCode"
                                className="input-style text-sm sm:text-base"
                                value={formData.zipCode || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Personal Information</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Date of Birth <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="dob"
                                className="input-style text-sm sm:text-base"
                                value={formData.dob || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Age <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="age"
                                className="input-style text-sm sm:text-base"
                                value={formData.age || ''}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="gender"
                                className="input-style text-sm sm:text-base"
                                value={gender}
                                onChange={handleGenderChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        {gender === 'Other' && (
                            <div>
                                <label className="block text-xs sm:text-sm font-medium">Specify Gender</label>
                                <select
                                    name="customGender"
                                    className="input-style text-sm sm:text-base"
                                    value={customGender}
                                    onChange={(e) => {
                                        setCustomGender(e.target.value);
                                        setIsDirty(true);
                                    }}
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
                                Civil Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="civilStatus"
                                className="input-style text-sm sm:text-base"
                                value={formData.civilStatus || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                                <option value="Common-Law">Common-Law</option>
                                <option value="Annulled">Annulled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">Religion</label>
                            <input
                                type="text"
                                name="religion"
                                className="input-style text-sm sm:text-base"
                                value={formData.religion || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Identification</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Type of ID <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="idType"
                                className="input-style text-sm sm:text-base"
                                value={formData.idType || ''}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Passport">Passport</option>
                                <option value="Driver’s License">Driver’s License</option>
                                <option value="SSS">SSS</option>
                                <option value="PhilHealth">PhilHealth</option>
                                <option value="TIN">TIN</option>
                                <option value="Voter's ID">Voter's ID</option>
                                <option value="Postal ID">Postal ID</option>
                                <option value="PRC ID">PRC ID</option>
                                <option value="UMID">UMID</option>
                                <option value="Barangay ID">Barangay ID</option>
                                <option value="Student ID">Student ID</option>
                                <option value="No ID">No ID</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                ID No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="idNo"
                                className="input-style text-sm sm:text-base"
                                value={formData.idNo || ''}
                                onChange={handleChange}
                                required
                                disabled={formData.idType === 'No ID'}
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="phoneNumber"
                                className="input-style text-sm sm:text-base"
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Employment</legend>
                    <div className="mb-4">
                        <label className="block text-xs sm:text-sm font-medium">
                            Employment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="employmentType"
                            className="input-style text-sm sm:text-base"
                            value={employmentType}
                            onChange={handleEmploymentChange}
                            required
                        >
                            <option value="">Select</option>
                            <option value="employed">Employed</option>
                            <option value="self-employed">Self-Employed</option>
                            <option value="student">Student</option>
                            <option value="retired">Retired</option>
                            <option value="unemployed">Unemployed</option>
                        </select>
                    </div>
                    {employmentType === 'employed' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium">Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    className="input-style text-sm sm:text-base"
                                    value={formData.occupation || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-medium">Skills</label>
                                <input
                                    type="text"
                                    name="skills"
                                    className="input-style text-sm sm:text-base"
                                    value={formData.skills || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-medium">Company Address</label>
                                <input
                                    type="text"
                                    name="companyAddress"
                                    className="input-style text-sm sm:text-base"
                                    value={formData.companyAddress || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Educational Attainment</legend>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium">
                            Education Level <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="education"
                            className="input-style text-sm sm:text-base"
                            value={formData.education || ''}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select</option>
                            <option value="Elementary">Elementary</option>
                            <option value="High School">High School</option>
                            <option value="College">College</option>
                            <option value="Vocational">Vocational</option>
                        </select>
                    </div>
                </fieldset>

                <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
                    <button
                        type="button"
                        className="bg-gray-500 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-gray-600 active:bg-gray-700 text-sm sm:text-base w-full sm:w-auto transform hover:scale-105 active:scale-95"
                        onClick={handleBackClick}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        className="bg-red-600 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-red-700 active:bg-red-800 text-sm sm:text-base w-full sm:w-auto transform hover:scale-105 active:scale-95"
                        onClick={async () => {
                            try {
                                // Check if spouse data exists
                                const { data: residentData, error: fetchError } = await supabase
                                    .from('residents')
                                    .select('spouse')
                                    .eq('user_id', userId)
                                    .maybeSingle(); // Use maybeSingle to handle no rows gracefully

                                if (fetchError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error checking spouse data: ${fetchError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // If no resident data or no spouse data exists
                                if (!residentData || !residentData.spouse) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'info',
                                        title: 'No spouse data to clear',
                                        text: 'The spouse profile is already empty.',
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Confirm deletion if spouse data exists
                                const result = await Swal.fire({
                                    title: 'Are you sure?',
                                    text: 'This will clear all spouse data. This action cannot be undone.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'Yes, clear it!',
                                    scrollbarPadding: false,
                                });

                                if (!result.isConfirmed) return;

                                // Clear spouse data
                                const { error: updateError } = await supabase
                                    .from('residents')
                                    .update({ spouse: null })
                                    .eq('user_id', userId);

                                if (updateError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error clearing spouse data: ${updateError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Reset form state
                                setFormData({
                                    firstName: '',
                                    lastName: '',
                                    middleName: '',
                                    middleInitial: '',
                                    extension: '',
                                    address: '',
                                    region: '',
                                    province: '',
                                    city: '',
                                    barangay: '',
                                    zone: '',
                                    zipCode: '',
                                    dob: '',
                                    age: '',
                                    gender: '',
                                    customGender: '',
                                    civilStatus: '',
                                    religion: '',
                                    phoneNumber: '',
                                    idType: '',
                                    idNo: '',
                                    employmentType: '',
                                    occupation: '',
                                    skills: '',
                                    companyAddress: '',
                                    education: '',
                                });
                                setGender('');
                                setCustomGender('');
                                setEmploymentType('');

                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'success',
                                    title: 'Spouse data cleared successfully',
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
                    </button>
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

SpouseForm.propTypes = {
    data: PropTypes.object,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    userId: PropTypes.string,
};

export default SpouseForm;