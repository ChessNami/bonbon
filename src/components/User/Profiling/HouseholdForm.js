import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabaseClient';
import {
    getAllRegions,
    getProvincesByRegion,
    getMunicipalitiesByProvince,
    getBarangaysByMunicipality,
} from '@aivangogh/ph-address';
import Compressor from 'compressorjs';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

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

const HouseholdForm = ({ data, onNext, onBack, userId }) => {
    const [formData, setFormData] = useState({
        ...data,
        age: data?.dob ? calculateAge(data.dob) : data?.age || '',
        image: null,
        image_preview: '',
        croppedImage: null,
    });
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [gender, setGender] = useState(data?.gender || '');
    const [customGender, setCustomGender] = useState(data?.customGender || '');
    const [employmentType, setEmploymentType] = useState(data?.employmentType || '');
    const [isAlertVisible, setIsAlertVisible] = useState(false);
    const [errors, setErrors] = useState({});
    const [signedImageUrl, setSignedImageUrl] = useState(null);
    const cropperRef = useRef(null);

    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.log('No userId provided, skipping fetch.');
            return;
        }

        try {
            const { data: residentData, error } = await supabase
                .from('residents')
                .select('household, image_url')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching household data:', error.message);
                return;
            }

            if (residentData?.household) {
                const householdData = {
                    ...residentData.household,
                    age: residentData.household.dob
                        ? calculateAge(residentData.household.dob)
                        : residentData.household.age || '',
                    image: null,
                    image_preview: '',
                    croppedImage: null,
                };
                setFormData(householdData);
                setGender(residentData.household.gender || '');
                setCustomGender(residentData.household.customGender || '');
                setEmploymentType(residentData.household.employmentType || '');
            }

            // Fetch signed URL for existing image if image_url exists
            if (residentData?.image_url) {
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('householdhead')
                    .createSignedUrl(residentData.image_url, 7200); // 2 hours

                if (signedUrlError) {
                    console.error('Error generating signed URL:', signedUrlError.message);
                    setSignedImageUrl(null);
                } else {
                    setSignedImageUrl(signedUrlData.signedUrl);
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching household data:', error.message);
        }
    }, [userId]);

    useEffect(() => {
        setRegions(getAllRegions());
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        if (formData.region) setProvinces(getProvincesByRegion(formData.region));
        if (formData.province) setCities(getMunicipalitiesByProvince(formData.province));
        if (formData.city) setBarangays(getBarangaysByMunicipality(formData.city));
    }, [formData.region, formData.province, formData.city]);

    const handleChange = (e) => {
        const { name, value } = e.target;
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
        setErrors({ ...errors, [name]: '' });

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
        if (value !== 'Other') setCustomGender('');
        handleChange(e);
    };

    const handleEmploymentChange = (e) => {
        setEmploymentType(e.target.value);
        handleChange(e);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
            setFormData({
                ...formData,
                image: file,
                image_preview: URL.createObjectURL(file),
                croppedImage: null,
            });
            setErrors({ ...errors, image: '' });
        } else {
            setErrors({ ...errors, image: 'Please upload a PNG or JPEG/JPG file.' });
            Swal.fire({
                icon: 'error',
                title: 'Invalid File',
                text: 'Only PNG and JPEG/JPG files are allowed.',
            });
        }
    };

    const showAlert = (message) => {
        if (!isAlertVisible) {
            setIsAlertVisible(true);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: message,
                timer: 1500,
                showConfirmButton: false,
                scrollbarPadding: false,
            }).then(() => setIsAlertVisible(false));
        }
    };

    const validateForm = () => {
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
            'employmentType',
            'education',
        ];

        for (const field of requiredFields) {
            if (!formData[field]) {
                newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
            }
        }

        // Only validate image if no image_url exists and no new image is selected
        if (!formData.image_url && !formData.image) {
            newErrors.image = 'image is required';
        }

        if (formData.idType !== 'No ID' && !formData.idNo) {
            newErrors.idNo = 'ID No. is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showAlert('Please fill in all required fields');
            return;
        }

        try {
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we save your data.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            let imageUrl = formData.image_url || null;

            if (formData.image && cropperRef.current && cropperRef.current.cropper) {
                const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
                    width: 600,
                    height: 600,
                });

                const whiteBgCanvas = document.createElement('canvas');
                whiteBgCanvas.width = 600;
                whiteBgCanvas.height = 600;
                const ctx = whiteBgCanvas.getContext('2d');

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, whiteBgCanvas.width, whiteBgCanvas.height);
                ctx.drawImage(croppedCanvas, 0, 0);

                const compressedImage = await new Promise((resolve, reject) => {
                    whiteBgCanvas.toBlob((blob) => {
                        if (blob) {
                            new Compressor(blob, {
                                quality: 0.8,
                                maxWidth: 800,
                                maxHeight: 800,
                                success: (compressedResult) => resolve(compressedResult),
                                error: (err) => reject(new Error(`Image compression failed: ${err.message}`)),
                            });
                        } else {
                            reject(new Error('Cropping failed: No blob generated.'));
                        }
                    }, 'image/jpeg');
                });

                const fileName = `householdhead/${userId}/profile.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('householdhead')
                    .upload(fileName, compressedImage, {
                        cacheControl: '3600',
                        upsert: true,
                    });

                if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);

                imageUrl = fileName;
            }

            const updatedData = {
                ...formData,
                gender,
                customGender: gender === 'Other' ? customGender : '',
                employmentType,
                image_url: imageUrl,
            };

            const { error: householdError } = await supabase
                .from('residents')
                .upsert(
                    { user_id: userId, household: updatedData, image_url: imageUrl },
                    { onConflict: 'user_id' }
                );

            if (householdError) {
                showAlert(`An error occurred while saving household data: ${householdError.message}`);
                return;
            }

            if (formData.civilStatus !== 'Married') {
                const { error: spouseError } = await supabase
                    .from('residents')
                    .update({ spouse: null })
                    .eq('user_id', userId);

                if (spouseError) {
                    showAlert(`An error occurred while clearing spouse data: ${spouseError.message}`);
                    return;
                }
            }

            Swal.close();
            const nextTab = formData.civilStatus === 'Married' ? 'spouseForm' : 'householdComposition';
            onNext(updatedData, nextTab);
        } catch (error) {
            Swal.close();
            console.error('Unexpected error:', error);
            showAlert(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
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
                    <legend className="font-semibold text-sm sm:text-base">Profile Image</legend>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium">
                            Image (PNG/JPEG) {formData.image_url ? '' : <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={handleImageChange}
                            className={`input-style text-sm sm:text-base ${errors.image ? 'border-red-500' : ''}`}
                        />
                        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                    </div>
                    {signedImageUrl && !formData.image_preview && (
                        <div className="mt-4">
                            <img
                                src={signedImageUrl}
                                alt="Household Head"
                                className="w-48 h-48 object-cover rounded-full mx-auto"
                                onError={() => setSignedImageUrl(null)}
                            />
                        </div>
                    )}
                    {formData.image_preview && (
                        <div className="mt-4">
                            <Cropper
                                ref={cropperRef}
                                src={formData.image_preview}
                                style={{ height: 300, width: '100%' }}
                                aspectRatio={1}
                                guides={true}
                                cropBoxMovable={true}
                                cropBoxResizable={true}
                                zoomable={true}
                                scalable={true}
                                viewMode={1}
                                className="w-full"
                            />
                        </div>
                    )}
                </fieldset>

                <fieldset className="border p-3 sm:p-4 rounded-lg">
                    <legend className="font-semibold text-sm sm:text-base">Name of Household Head</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                className={`input-style text-sm sm:text-base ${errors.firstName ? 'border-red-500' : ''}`}
                                value={formData.firstName || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                className={`input-style text-sm sm:text-base ${errors.lastName ? 'border-red-500' : ''}`}
                                value={formData.lastName || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
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
                                className={`input-style text-sm sm:text-base ${errors.address ? 'border-red-500' : ''}`}
                                value={formData.address || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Region <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="region"
                                className={`input-style text-sm sm:text-base ${errors.region ? 'border-red-500' : ''}`}
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
                            {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Province <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="province"
                                className={`input-style text-sm sm:text-base ${errors.province ? 'border-red-500' : ''}`}
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
                            {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                City <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="city"
                                className={`input-style text-sm sm:text-base ${errors.city ? 'border-red-500' : ''}`}
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
                            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Barangay <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="barangay"
                                className={`input-style text-sm sm:text-base ${errors.barangay ? 'border-red-500' : ''}`}
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
                            {errors.barangay && <p className="text-red-500 text-xs mt-1">{errors.barangay}</p>}
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
                                className={`input-style text-sm sm:text-base ${errors.dob ? 'border-red-500' : ''}`}
                                value={formData.dob || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Age <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="age"
                                className={`input-style text-sm sm:text-base ${errors.age ? 'border-red-500' : ''}`}
                                value={formData.age || ''}
                                disabled
                            />
                            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium">
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="gender"
                                className={`input-style text-sm sm:text-base ${errors.gender ? 'border-red-500' : ''}`}
                                value={gender}
                                onChange={handleGenderChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                        </div>
                        {gender === 'Other' && (
                            <div>
                                <label className="block text-xs sm:text-sm font-medium">Specify Gender</label>
                                <select
                                    name="customGender"
                                    className="input-style text-sm sm:text-base"
                                    value={customGender}
                                    onChange={(e) => setCustomGender(e.target.value)}
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
                                className={`input-style text-sm sm:text-base ${errors.civilStatus ? 'border-red-500' : ''}`}
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
                            {errors.civilStatus && <p className="text-red-500 text-xs mt-1">{errors.civilStatus}</p>}
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
                                className={`input-style text-sm sm:text-base ${errors.idType ? 'border-red-500' : ''}`}
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
                                className={`input-style text-sm sm:text-base ${errors.idNo ? 'border-red-500' : ''}`}
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
                                className={`input-style text-sm sm:text-base ${errors.phoneNumber ? 'border-red-500' : ''}`}
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                required
                            />
                            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
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
                            className={`input-style text-sm sm:text-base ${errors.employmentType ? 'border-red-500' : ''}`}
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
                        {errors.employmentType && <p className="text-red-500 text-xs mt-1">{errors.employmentType}</p>}
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
                            className={`input-style text-sm sm:text-base ${errors.education ? 'border-red-500' : ''}`}
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
                        {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
                    </div>
                </fieldset>

                <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
                    {onBack && (
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-4 py-2 rounded-md transition duration-150 hover:bg-gray-600 active:bg-gray-700 text-sm sm:text-base w-full sm:w-auto"
                            onClick={handleBackClick}
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md transition duration-150 hover:bg-blue-700 active:bg-blue-800 text-sm sm:text-base w-full sm:w-auto"
                        onClick={handleSubmit}
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
};

HouseholdForm.propTypes = {
    data: PropTypes.object,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    userId: PropTypes.string,
};

export default HouseholdForm;