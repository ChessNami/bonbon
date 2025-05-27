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
        valid_id: null,
        valid_id_preview: '',
    });
    const [errors, setErrors] = useState({});
    const [signedValidIdUrl, setSignedValidIdUrl] = useState(null);
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

        // Fetch signed URL for existing valid ID
        if (residentData?.spouse?.valid_id_url) {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('validid')
                .createSignedUrl(residentData.spouse.valid_id_url, 7200);
            if (signedUrlError) {
                console.error('Error generating signed URL for spouse valid ID:', signedUrlError.message);
                setSignedValidIdUrl(null);
            } else {
                setSignedValidIdUrl(signedUrlData.signedUrl);
            }
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
        const { name, value, files } = e.target;
        setIsDirty(true); // Mark form as dirty on any change
        if (name === 'valid_id') {
            const file = files[0];
            if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'application/pdf')) {
                setFormData((prev) => ({
                    ...prev,
                    valid_id: file,
                    valid_id_preview: file.type === 'application/pdf' ? '' : URL.createObjectURL(file),
                }));
                setErrors((prev) => ({ ...prev, valid_id: '' }));
            } else {
                setErrors((prev) => ({ ...prev, valid_id: 'Please upload a PNG, JPEG/JPG, or PDF file.' }));
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File',
                    text: 'Only PNG, JPEG/JPG, or PDF files are allowed.',
                });
            }
        } else if (name === 'phoneNumber') {
            // Allow only digits and limit to 11 characters
            const cleanedValue = value.replace(/[^0-9]/g, '').slice(0, 11);
            setFormData((prev) => ({
                ...prev,
                [name]: cleanedValue,
            }));
            // Validate format
            if (cleanedValue && (!cleanedValue.startsWith('09') || cleanedValue.length !== 11)) {
                setErrors((prev) => ({
                    ...prev,
                    phoneNumber: 'Phone number must be 11 digits starting with 09 (e.g., 09xxxxxxxxx)',
                }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    phoneNumber: '',
                }));
            }
        } else {
            setFormData((prev) => {
                const updatedData = { ...prev, [name]: value };
                if (name === 'middleName') {
                    updatedData.middleInitial = value ? value.charAt(0).toUpperCase() : '';
                }
                if (name === 'idType' && value === 'No ID') {
                    updatedData.idNo = 'No ID';
                }
                if (name === 'dob') {
                    updatedData.age = calculateAge(value);
                }
                return updatedData;
            });
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }

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
        // Validate form
        let newErrors = {};
        const requiredFields = [
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
            'education',
            'employmentType',
        ];

        for (const field of requiredFields) {
            if (!formData[field]) {
                newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
            }
        }

        if (!formData.valid_id_url && !formData.valid_id) {
            newErrors.valid_id = 'valid ID is required';
        }

        if (formData.idType !== 'No ID' && !formData.idNo) {
            newErrors.idNo = 'ID No. is required';
        }

        if (formData.phoneNumber) {
            if (!/^09[0-9]{9}$/.test(formData.phoneNumber)) {
                newErrors.phoneNumber = 'Phone number must be 11 digits starting with 09 (e.g., 09xxxxxxxxx)';
            }
        } else {
            newErrors.phoneNumber = 'phone number is required';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Please fill in all required fields correctly',
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we save your data.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                scrollbarPadding: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            let validIdUrl = formData.valid_id_url || null;

            // Handle valid ID upload
            if (formData.valid_id) {
                const fileExt = formData.valid_id.name.split('.').pop();
                const fileName = `identification/${userId}/spouse_valid_id_${formData.idType.replace(/\s/g, '_')}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('validid')
                    .upload(fileName, formData.valid_id, {
                        cacheControl: '3600',
                        upsert: true,
                    });

                if (uploadError) throw new Error(`Error uploading valid ID: ${uploadError.message}`);

                validIdUrl = fileName;
            }

            const updatedData = {
                ...formData,
                gender,
                customGender: gender === 'Other' ? customGender : '',
                employmentType,
                valid_id_url: validIdUrl,
            };

            const { error } = await supabase
                .from('residents')
                .update({
                    spouse: updatedData,
                    spouse_valid_id_url: validIdUrl,
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
                    scrollbarPadding: false,
                });
                return;
            }

            Swal.close();
            setIsDirty(false); // Reset dirty state after saving
            onNext(updatedData, 'householdComposition');
        } catch (error) {
            Swal.close();
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
                                className={`input-style text-sm sm:text-base ${errors.zipCode ? 'border-red-500' : ''}`}
                                value={formData.zipCode || ''}
                                onChange={handleChange}
                                maxLength={4}
                                pattern="[0-9]*"
                                onInput={(e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                    if (e.target.value.length > 0 && !/^[0-9]{4}$/.test(e.target.value)) {
                                        e.target.setCustomValidity('Zip code must be 4 digits');
                                    } else {
                                        e.target.setCustomValidity('');
                                    }
                                }}
                                required
                            />
                            {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
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
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.idType ? 'border-red-500' : 'border-gray-300'}`}
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
                            {errors.idType && <p className="text-red-500 text-xs mt-1">{errors.idType}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                ID No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="idNo"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.idNo ? 'border-red-500' : 'border-gray-300'}`}
                                value={formData.idNo || ''}
                                onChange={handleChange}
                                required
                                disabled={formData.idType === 'No ID'}
                            />
                            {errors.idNo && <p className="text-red-500 text-xs mt-1">{errors.idNo}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="phoneNumber"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                maxLength={11}
                                pattern="09[0-9]{9}"
                                onInput={(e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                                    if (e.target.value && !e.target.value.startsWith('09')) {
                                        e.target.setCustomValidity('Phone number must start with 09');
                                    } else {
                                        e.target.setCustomValidity('');
                                    }
                                }}
                                placeholder="09xxxxxxxxx"
                                required
                            />
                            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                        </div>
                        <div className="sm:col-span-2 md:col-span-3">
                            <label className="block text-xs sm:text-sm font-medium">
                                Valid ID (PNG/JPEG/PDF) {formData.valid_id_url ? '' : <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="file"
                                name="valid_id"
                                accept="image/png,image/jpeg,application/pdf"
                                onChange={handleChange}
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.valid_id ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.valid_id && <p className="text-red-500 text-xs mt-1">{errors.valid_id}</p>}
                            {signedValidIdUrl && !formData.valid_id_preview && formData.valid_id_url?.endsWith('.pdf') && (
                                <p className="text-sm mt-2">PDF uploaded: {formData.valid_id_url.split('/').pop()}</p>
                            )}
                            {signedValidIdUrl && !formData.valid_id_preview && !formData.valid_id_url?.endsWith('.pdf') && (
                                <img
                                    src={signedValidIdUrl}
                                    alt="Valid ID"
                                    className="mt-2 w-48 h-48 object-contain"
                                    onError={() => setSignedValidIdUrl(null)}
                                />
                            )}
                            {formData.valid_id_preview && (
                                <img
                                    src={formData.valid_id_preview}
                                    alt="Valid ID Preview"
                                    className="mt-2 w-48 h-48 object-contain"
                                />
                            )}
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