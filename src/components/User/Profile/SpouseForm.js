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
        <div className="p-4 shadow-lg rounded-lg">
            <form className="space-y-6">
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Name of Spouse</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label>
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                className="input-style"
                                value={formData.firstName || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                className="input-style"
                                value={formData.lastName || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Middle Name</label>
                            <input
                                type="text"
                                name="middleName"
                                className="input-style"
                                value={formData.middleName || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label>Middle Initial</label>
                            <input
                                type="text"
                                name="middleInitial"
                                className="input-style"
                                value={formData.middleInitial || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <label>Extension</label>
                            <select
                                name="extension"
                                className="input-style"
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

                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Address</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label>
                                Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="address"
                                className="input-style"
                                value={formData.address || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Region <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="region"
                                className="input-style"
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
                            <label>
                                Province <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="province"
                                className="input-style"
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
                            <label>
                                City <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="city"
                                className="input-style"
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
                            <label>
                                Barangay <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="barangay"
                                className="input-style"
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
                                    <label>Zone#</label>
                                    <select
                                        name="zone"
                                        className="input-style"
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
                            <label>
                                Zip Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="zipCode"
                                className="input-style"
                                value={formData.zipCode || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Personal Information</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label>
                                Date of Birth <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="dob"
                                className="input-style"
                                value={formData.dob || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Age <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="age"
                                className="input-style"
                                value={formData.age || ''}
                                disabled
                            />
                        </div>
                        <div>
                            <label>
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="gender"
                                className="input-style"
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
                                <label>Specify Gender</label>
                                <input
                                    type="text"
                                    name="customGender"
                                    className="input-style"
                                    value={customGender}
                                    onChange={(e) => {
                                        setCustomGender(e.target.value);
                                        setIsDirty(true);
                                    }}
                                />
                            </div>
                        )}
                        <div>
                            <label>
                                Civil Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="civilStatus"
                                className="input-style"
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
                            <label>Religion</label>
                            <input
                                type="text"
                                name="religion"
                                className="input-style"
                                value={formData.religion || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Identification</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label>
                                Type of ID <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="idType"
                                className="input-style"
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
                            <label>
                                ID No. <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="idNo"
                                className="input-style"
                                value={formData.idNo || ''}
                                onChange={handleChange}
                                required
                                disabled={formData.idType === 'No ID'}
                            />
                        </div>
                        <div>
                            <label>
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="phoneNumber"
                                className="input-style"
                                value={formData.phoneNumber || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Employment</legend>
                    <div className="mb-4">
                        <label>
                            Employment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="employmentType"
                            className="input-style"
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label>Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    className="input-style"
                                    value={formData.occupation || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label>Skills</label>
                                <input
                                    type="text"
                                    name="skills"
                                    className="input-style"
                                    value={formData.skills || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label>Company Address</label>
                                <input
                                    type="text"
                                    name="companyAddress"
                                    className="input-style"
                                    value={formData.companyAddress || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}
                </fieldset>

                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Educational Attainment</legend>
                    <div>
                        <label>
                            Education Level <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="education"
                            className="input-style"
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

                <div className="flex justify-between mt-4">
                    <button
                        type="button"
                        className="bg-gray-500 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-gray-600 active:bg-gray-700 transform hover:scale-105 active:scale-95"
                        onClick={handleBackClick}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md transition duration-150 ease-in-out hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105 active:scale-95"
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