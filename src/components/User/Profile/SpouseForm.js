import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from "@aivangogh/ph-address";

const SpouseForm = () => {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        middleName: "",
        middleInitial: "",
        extension: "",
        address: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        zone: "",
        zipCode: "",
        dob: "",
        age: "",
        gender: "",
        customGender: "",
        civilStatus: "",
        religion: "",
        idType: "",
        idNo: "",
        phoneNumber: "",
        occupation: "",
        skills: "",
        companyAddress: "",
        education: ""
    });

    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);

    const [gender, setGender] = useState("");
    const [customGender, setCustomGender] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setFormData((prevData) => ({
                    ...prevData,
                    email: user.email
                }));
            }
        };

        fetchUser();
        setRegions(getAllRegions());
    }, []);

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
            setCustomGender(""); // Reset custom gender if user switches back
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(formData);
    };

    return (
        <div className="p-4 shadow-lg rounded-lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Household Head */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Name of Spouse</legend>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                            <input type="text" name="firstName" id="firstName" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input type="text" name="lastName" id="lastName" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">Middle Name</label>
                            <input type="text" name="middleName" id="middleName" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700">Middle Initial (M.I.)</label>
                            <input
                                type="text"
                                name="middleInitial"
                                id="middleInitial"
                                className="input-style w-16"
                                value={formData.middleInitial}
                                readOnly
                            />
                        </div>

                        <div>
                            <label htmlFor="extension" className="block text-sm font-medium text-gray-700">Extension (Ext.)</label>
                            <select name="extension" id="extension" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select Extension</option>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address (House #/Block/Street/Subsdivision/Building)</label>
                            <input type="text" name="address" id="address" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="region" className="block text-sm font-medium text-gray-700">Region</label>
                            <select name="region" id="region" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select Region</option>
                                {regions.map((region) => (
                                    <option key={region.psgcCode} value={region.psgcCode}>
                                        {region.designation} - {region.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="province" className="block text-sm font-medium text-gray-700">Province</label>
                            <select name="province" id="province" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select Province</option>
                                {provinces.map((province) => (
                                    <option key={province.psgcCode} value={province.psgcCode}>
                                        {province.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                            <select name="city" id="city" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select City</option>
                                {cities.map((city) => (
                                    <option key={city.psgcCode} value={city.psgcCode}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="barangay" className="block text-sm font-medium text-gray-700">Barangay</label>
                            <select name="barangay" id="barangay" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select Barangay</option>
                                {barangays.map((barangay) => (
                                    <option key={barangay.psgcCode} value={barangay.psgcCode}>
                                        {barangay.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="zone" className="block text-sm font-medium text-gray-700">Zone#</label>
                            <select name="zone" id="zone" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled>Select Zone</option>
                                {[...Array(9)].map((_, index) => (
                                    <option key={index + 1} value={`Zone ${index + 1}`}>
                                        Zone {index + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">Zip Code</label>
                            <input type="text" name="zipCode" id="zipCode" className="input-style" onChange={handleChange} />
                        </div>
                    </div>
                </fieldset>

                {/* Personal Information */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Personal Information</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Date of Birth */}
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                            <input type="date" name="dob" id="dob" className="input-style" />
                        </div>

                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                            <input type="number" name="age" id="age" className="input-style" />
                        </div>

                        {/* Gender Selection */}
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                            <select name="gender" id="gender" className="input-style" onChange={handleGenderChange} value={gender}>
                                <option value="" disabled >Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Custom Gender Input (Appears when "Other" is ) */}
                        {gender === "Other" && (
                            <div>
                                <label htmlFor="customGender" className="block text-sm font-medium text-gray-700">Specify Gender</label>
                                <input
                                    type="text"
                                    name="customGender"
                                    id="customGender"
                                    className="input-style"
                                    placeholder="Enter gender"
                                    value={customGender}
                                    onChange={(e) => setCustomGender(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Civil Status Selection */}
                        <div>
                            <label htmlFor="civilStatus" className="block text-sm font-medium text-gray-700">Civil Status</label>
                            <select name="civilStatus" id="civilStatus" className="input-style">
                                <option value="" disabled >Select Civil Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                                <option value="Common-Law">Common-Law</option>
                                <option value="Annulled">Annulled</option>
                            </select>
                        </div>

                        {/* Religion */}
                        <div>
                            <label htmlFor="religion" className="block text-sm font-medium text-gray-700">Religion</label>
                            <input type="text" name="religion" id="religion" className="input-style" />
                        </div>
                    </div>
                </fieldset>

                {/* Identification */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Identification</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="idType" className="block text-sm font-medium text-gray-700">Type of ID</label>
                            <select name="idType" id="idType" className="input-style" onChange={handleChange} defaultValue="">
                                <option value="" disabled >Select ID Type</option>
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
                            <label htmlFor="idNo" className="block text-sm font-medium text-gray-700">ID No.</label>
                            <input type="text" name="idNo" id="idNo" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Personal Phone Number</label>
                            <input type="tel" name="phoneNumber" id="phoneNumber" className="input-style" onChange={handleChange} placeholder="Ex. 09xxxxxxxxx" />
                        </div>
                    </div>
                </fieldset>

                {/* Employment */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Employment</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">Occupation</label>
                            <input type="text" name="occupation" id="occupation" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
                            <input type="text" name="skills" id="skills" className="input-style" onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Company Address</label>
                            <input type="text" name="companyAddress" id="companyAddress" className="input-style" onChange={handleChange} />
                        </div>
                    </div>
                </fieldset>

                {/* Educational Attainment */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Educational Attainment</legend>
                    <div>
                        <label htmlFor="education" className="block text-sm font-medium text-gray-700">Education Level</label>
                        <select name="education" id="education" className="input-style" onChange={handleChange} defaultValue="">
                            <option value="" disabled >Select Education Level</option>
                            <option value="Elementary">Elementary</option>
                            <option value="High School">High School</option>
                            <option value="College">College</option>
                            <option value="Vocational">Vocational</option>
                        </select>
                    </div>
                </fieldset>

                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 w-full">
                    Submit
                </button>
            </form>
        </div>
    );
};

export default SpouseForm;