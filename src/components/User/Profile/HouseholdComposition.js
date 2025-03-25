import React, { useState } from "react";

const HouseholdForm = () => {
    const [householdMembers, setHouseholdMembers] = useState([]);
    const [childrenCount, setChildrenCount] = useState("");
    const [numberOfhouseholdMembers, setNumberOfhouseholdMembers] = useState("");

    // Update household member count dynamically
    const handleHouseholdChange = (e) => {
        const count = parseInt(e.target.value, 10) || 0;
        setNumberOfhouseholdMembers(count);

        // Adjust the householdMembers array size
        setHouseholdMembers((prev) => {
            const newHousehold = [...prev];
            while (newHousehold.length < count) {
                newHousehold.push({
                    firstName: "",
                    lastName: "",
                    middleName: "",
                    middleInitial: "",
                    relation: "",
                    gender: "",
                    customGender: "",
                    age: "",
                    dob: "",
                    education: "",
                    occupation: "",
                });
            }
            return newHousehold.slice(0, count);
        });
    };

    // Handle changes in individual household member fields
    const handleMemberChange = (index, e) => {
        const { name, value } = e.target;

        setHouseholdMembers((prev) => {
            const updatedMembers = [...prev];
            updatedMembers[index] = {
                ...updatedMembers[index],
                [name]: value,
            };

            // Auto-generate middleInitial from middleName
            if (name === "middleName") {
                updatedMembers[index].middleInitial = value ? value.charAt(0).toUpperCase() : "";
            }

            return updatedMembers;
        });
    };

    // Handle gender selection for a specific household member
    const handleGenderChange = (index, e) => {
        const value = e.target.value;

        setHouseholdMembers((prev) => {
            const updatedMembers = [...prev];
            updatedMembers[index].gender = value;
            if (value !== "Other") {
                updatedMembers[index].customGender = "";
            }
            return updatedMembers;
        });
    };

    // Submit form data
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({
            childrenCount,
            numberOfhouseholdMembers,
            householdMembers,
        });
    };

    return (
        <div className="p-4 shadow-lg rounded-lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Household Details */}
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Household Composition</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="childrenCount" className="block text-sm font-medium text-gray-700">Number of Children</label>
                            <input type="number" name="childrenCount" id="childrenCount" className="input-style"
                                value={childrenCount} onChange={(e) => setChildrenCount(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="numberOfhouseholdMembers" className="block text-sm font-medium text-gray-700">
                                Number of Household Members (excluding Head & Spouse)
                            </label>
                            <input type="number" name="numberOfhouseholdMembers" id="numberOfhouseholdMembers" className="input-style"
                                value={numberOfhouseholdMembers} onChange={handleHouseholdChange} />
                        </div>
                    </div>
                </fieldset>

                {/* Dynamically Generated Household Member Forms */}
                {householdMembers.map((member, index) => (
                    <fieldset key={index} className="border p-4 rounded-lg">
                        <legend className="font-semibold">Household Member {index + 1}</legend>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Name Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input type="text" name="firstName" className="input-style" value={member.firstName}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input type="text" name="lastName" className="input-style" value={member.lastName}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                                <input type="text" name="middleName" className="input-style" value={member.middleName}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Middle Initial</label>
                                <input type="text" name="middleInitial" className="input-style" value={member.middleInitial} readOnly />
                            </div>

                            {/* Relation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Relation to Household Head</label>
                                <input type="text" name="relation" className="input-style" value={member.relation}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>

                            {/* Gender Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Gender</label>
                                <select name="gender" className="input-style" value={member.gender}
                                    onChange={(e) => handleGenderChange(index, e)}>
                                    <option value="" disabled>Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Custom Gender Field (Appears when "Other" is selected) */}
                            {member.gender === "Other" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Specify Gender</label>
                                    <input type="text" name="customGender" className="input-style" value={member.customGender}
                                        onChange={(e) => handleMemberChange(index, e)} placeholder="Enter gender" />
                                </div>
                            )}

                            {/* Age & DOB */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                <input type="date" name="dob" className="input-style" value={member.dob}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Age</label>
                                <input type="number" name="age" className="input-style" value={member.age}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>

                            {/* Education & Occupation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Education</label>
                                <input type="text" name="education" className="input-style" value={member.education}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Occupation</label>
                                <input type="text" name="occupation" className="input-style" value={member.occupation}
                                    onChange={(e) => handleMemberChange(index, e)} />
                            </div>
                        </div>
                    </fieldset>
                ))}

                {/* Submit Button */}
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 w-full">
                    Submit
                </button>
            </form>
        </div>
    );
};

export default HouseholdForm;
