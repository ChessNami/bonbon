import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from "@aivangogh/ph-address";

const HouseholdForm = ({ data, onNext, onBack }) => {
    const [formData, setFormData] = useState(data);
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [gender, setGender] = useState(data.gender || "");
    const [customGender, setCustomGender] = useState(data.customGender || "");
    const [employmentType, setEmploymentType] = useState(data.employmentType || "");

    useEffect(() => {
        setRegions(getAllRegions());
    }, []);

    useEffect(() => {
        if (formData.region) setProvinces(getProvincesByRegion(formData.region));
        if (formData.province) setCities(getMunicipalitiesByProvince(formData.province));
        if (formData.city) setBarangays(getBarangaysByMunicipality(formData.city));
    }, [formData.region, formData.province, formData.city]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prevData) => {
            const updatedData = { ...prevData, [name]: value };

            if (name === "middleName") {
                updatedData.middleInitial = value ? value.charAt(0).toUpperCase() : "";
            }

            return updatedData;
        });

        if (name === "region") {
            setProvinces(getProvincesByRegion(value));
            setCities([]);
            setBarangays([]);
        } else if (name === "province") {
            setCities(getMunicipalitiesByProvince(value));
            setBarangays([]);
        } else if (name === "city") {
            setBarangays(getBarangaysByMunicipality(value));
        }
    };

    const handleGenderChange = (e) => {
        setGender(e.target.value);
        if (e.target.value !== "Other") {
            setCustomGender("");
        }
        handleChange(e);
    };

    const handleEmploymentChange = (e) => {
        setEmploymentType(e.target.value);
        handleChange(e);
    };
    const handleSubmit = () => {
        // Validate required fields
        const requiredFields = ["firstName", "lastName", "address", "region", "province", "city", "barangay", "dob", "age", "gender", "civilStatus", "phoneNumber"];
        for (let field of requiredFields) {
            if (!formData[field]) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: `Please fill in the required field: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
                    timer: 1500,
                    showConfirmButton: false,
                    scrollbarPadding: false,
                });
                return;
            }
        }

        onNext({
            ...formData,
            gender: gender,
            customGender: gender === "Other" ? customGender : "",
            employmentType: employmentType
        });
    };

    return (
        <div className="p-4 shadow-lg rounded-lg">
            <form className="space-y-6">
                {/* Household Head */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Name of Household Head</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                            <input type="text" name="firstName" id="firstName" className="input-style" value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                            <input type="text" name="lastName" id="lastName" className="input-style" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">Middle Name</label>
                            <input type="text" name="middleName" id="middleName" className="input-style" value={formData.middleName} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700">Middle Initial</label>
                            <input type="text" name="middleInitial" id="middleInitial" className="input-style" value={formData.middleInitial} readOnly />
                        </div>
                        <div>
                            <label htmlFor="extension" className="block text-sm font-medium text-gray-700">Extension (Ext.)</label>
                            <select name="extension" id="extension" className="input-style" value={formData.extension} onChange={handleChange}>
                                <option value="">Select Extension</option>
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

                {/* Address */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Address</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address <span className="text-red-500">*</span></label>
                            <input type="text" name="address" id="address" className="input-style" value={formData.address} onChange={handleChange} placeholder="House #/Block/Street/Subsdivision/Building" required />
                        </div>
                        <div>
                            <label htmlFor="region" className="block text-sm font-medium text-gray-700">Region <span className="text-red-500">*</span></label>
                            <select name="region" id="region" className="input-style" value={formData.region} onChange={handleChange} required>
                                <option value="">Select Region</option>
                                {regions.map((region) => (
                                    <option key={region.psgcCode} value={region.psgcCode}>
                                        {region.designation} - {region.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="province" className="block text-sm font-medium text-gray-700">Province <span className="text-red-500">*</span></label>
                            <select name="province" id="province" className="input-style" value={formData.province} onChange={handleChange} required>
                                <option value="">Select Province</option>
                                {provinces.map((province) => (
                                    <option key={province.psgcCode} value={province.psgcCode}>
                                        {province.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                            <select name="city" id="city" className="input-style" value={formData.city} onChange={handleChange} required>
                                <option value="">Select City</option>
                                {cities.map((city) => (
                                    <option key={city.psgcCode} value={city.psgcCode}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="barangay" className="block text-sm font-medium text-gray-700">Barangay <span className="text-red-500">*</span></label>
                            <select name="barangay" id="barangay" className="input-style" value={formData.barangay} onChange={handleChange} required>
                                <option value="">Select Barangay</option>
                                {barangays.map((barangay) => (
                                    <option key={barangay.psgcCode} value={barangay.psgcCode}>
                                        {barangay.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="zone" className="block text-sm font-medium text-gray-700">Zone# <span className="text-red-500">*</span></label>
                            <select name="zone" id="zone" className="input-style" value={formData.zone} onChange={handleChange} required>
                                <option value="">Select Zone</option>
                                {[...Array(9)].map((_, index) => (
                                    <option key={index + 1} value={`Zone ${index + 1}`}>
                                        Zone {index + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">Zip Code <span className="text-red-500">*</span></label>
                            <input type="text" name="zipCode" id="zipCode" className="input-style" value={formData.zipCode} onChange={handleChange} required/>
                        </div>
                    </div>
                </fieldset>

                {/* Personal Information */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Personal Information</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></label>
                            <input type="date" name="dob" id="dob" className="input-style" value={formData.dob} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="age"
                                id="age"
                                className="input-style"
                                value={formData.age}
                                onChange={handleChange}
                                min="0"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender <span className="text-red-500">*</span></label>
                            <select name="gender" id="gender" className="input-style" value={gender} onChange={handleGenderChange} required>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        {gender === "Other" && (
                            <div>
                                <label htmlFor="customGender" className="block text-sm font-medium text-gray-700">Specify Gender</label>
                                <input
                                    type="text"
                                    name="customGender"
                                    id="customGender"
                                    className="input-style"
                                    value={customGender}
                                    onChange={(e) => setCustomGender(e.target.value)}
                                    placeholder="Enter gender"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="civilStatus" className="block text-sm font-medium text-gray-700">Civil Status <span className="text-red-500">*</span></label>
                            <select name="civilStatus" id="civilStatus" className="input-style" value={formData.civilStatus} onChange={handleChange} required>
                                <option value="">Select Civil Status</option>
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
                            <label htmlFor="religion" className="block text-sm font-medium text-gray-700">Religion</label>
                            <input type="text" name="religion" id="religion" className="input-style" value={formData.religion} onChange={handleChange} />
                        </div>
                    </div>
                </fieldset>

                {/* Identification */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Identification</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="idType" className="block text-sm font-medium text-gray-700">Type of ID <span className="text-red-500">*</span></label>
                            <select name="idType" id="idType" className="input-style" value={formData.idType} onChange={handleChange} required>
                                <option value="">Select ID Type</option>
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
                            </select>
                        </div>
                        <div>
                            <label htmlFor="idNo" className="block text-sm font-medium text-gray-700">ID No. <span className="text-red-500">*</span></label>
                            <input type="text" name="idNo" id="idNo" className="input-style" value={formData.idNo} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                            <input type="text" name="phoneNumber" id="phoneNumber" className="input-style" value={formData.phoneNumber} onChange={handleChange} placeholder="Ex. 09xxxxxxxxx" required />
                        </div>
                    </div>
                </fieldset>

                {/* Employment */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Employment</legend>
                    <div className="mb-4">
                        <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">
                            Employment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="employmentType"
                            id="employmentType"
                            className="input-style"
                            value={employmentType}
                            onChange={handleEmploymentChange}
                            required
                        >
                            <option value="">Select Employment Type</option>
                            <option value="employed">Employed</option>
                            <option value="self-employed">Self-Employed</option>
                            <option value="student">Student</option>
                            <option value="retired">Retired</option>
                            <option value="unemployed">Unemployed</option>
                        </select>
                    </div>
                    {employmentType === "employed" && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">Occupation</label>
                                <input type="text" name="occupation" id="occupation" className="input-style" value={formData.occupation} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
                                <input type="text" name="skills" id="skills" className="input-style" value={formData.skills} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Company Address</label>
                                <input type="text" name="companyAddress" id="companyAddress" className="input-style" value={formData.companyAddress} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                </fieldset>

                {/* Educational Attainment */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Educational Attainment</legend>
                    <div>
                        <label htmlFor="education" className="block text-sm font-medium text-gray-700">Education Level <span className="text-red-500">*</span></label>
                        <select name="education" id="education" className="input-style" value={formData.education} onChange={handleChange} required>
                            <option value="">Select Education Level</option>
                            <option value="Elementary">Elementary</option>
                            <option value="High School">High School</option>
                            <option value="College">College</option>
                            <option value="Vocational">Vocational</option>
                        </select>
                    </div>
                </fieldset>

                <div className="flex justify-between mt-4">
                    {onBack && (
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                            onClick={onBack}
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        onClick={handleSubmit}
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HouseholdForm;