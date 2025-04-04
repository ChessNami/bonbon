import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const HouseholdComposition = ({ data, childrenCount, numberOfhouseholdMembers, onNext, onBack, userId }) => {
    const [householdMembers, setHouseholdMembers] = useState(Array.isArray(data) ? data : []);
    const [localChildrenCount, setLocalChildrenCount] = useState(childrenCount || 0);
    const [localNumberOfhouseholdMembers, setLocalNumberOfhouseholdMembers] = useState(numberOfhouseholdMembers || 0);

    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.log("No userId provided, skipping fetch.");
            return;
        }

        const { data, error } = await supabase
            .from("residents")
            .select("household_composition, children_count, number_of_household_members")
            .eq("user_id", userId)
            .single();

        if (data && !error) {
            setHouseholdMembers(Array.isArray(data.household_composition) ? data.household_composition : []);
            setLocalChildrenCount(data.children_count || 0);
            setLocalNumberOfhouseholdMembers(data.number_of_household_members || 0);
        } else if (error) {
            console.error("Error fetching household composition:", error);
            setHouseholdMembers([]);
            setLocalChildrenCount(0);
            setLocalNumberOfhouseholdMembers(0);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        if (localNumberOfhouseholdMembers) {
            setHouseholdMembers((prev) => {
                const currentMembers = Array.isArray(prev) ? prev : [];
                const newHousehold = [...currentMembers];
                while (newHousehold.length < localNumberOfhouseholdMembers) {
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
                        occupation: ""
                    });
                }
                return newHousehold.slice(0, localNumberOfhouseholdMembers);
            });
        } else {
            setHouseholdMembers([]);
        }
    }, [localNumberOfhouseholdMembers]);

    const handleHouseholdChange = (e) => {
        const count = Math.max(0, parseInt(e.target.value, 10) || 0);
        setLocalNumberOfhouseholdMembers(count);
    };

    const handleMemberChange = (index, e) => {
        const { name, value } = e.target;
        setHouseholdMembers((prev) => {
            const updatedMembers = Array.isArray(prev) ? [...prev] : [];
            updatedMembers[index] = { ...updatedMembers[index], [name]: value };
            if (name === "middleName") {
                updatedMembers[index].middleInitial = value ? value.charAt(0).toUpperCase() : "";
            }
            return updatedMembers;
        });
    };

    const handleGenderChange = (index, e) => {
        const value = e.target.value;
        setHouseholdMembers((prev) => {
            const updatedMembers = Array.isArray(prev) ? [...prev] : [];
            updatedMembers[index] = { ...updatedMembers[index], gender: value };
            if (value !== "Other") updatedMembers[index].customGender = "";
            return updatedMembers;
        });
    };

    const handleSubmit = async () => {
        if (localNumberOfhouseholdMembers > 0) {
            for (let member of householdMembers) {
                const requiredFields = ["firstName", "lastName", "relation", "gender", "age", "dob", "education"];
                for (let field of requiredFields) {
                    if (!member[field]) {
                        Swal.fire({
                            toast: true,
                            position: "top-end",
                            icon: "error",
                            title: `Please fill in the required field: ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        return;
                    }
                }
            }
        }

        const { error } = await supabase
            .from("residents")
            .update({
                household_composition: householdMembers,
                children_count: parseInt(localChildrenCount, 10) || 0,
                number_of_household_members: parseInt(localNumberOfhouseholdMembers, 10) || 0
            })
            .eq("user_id", userId);

        if (error) {
            Swal.fire("Error", "Failed to save data", "error");
            return;
        }

        onNext(householdMembers, "confirmation", localChildrenCount, localNumberOfhouseholdMembers);
    };

    return (
        <div className="p-4 shadow-lg rounded-lg">
            <form className="space-y-6">
                <fieldset className="border p-4 rounded-lg">
                    <legend className="font-semibold">Household Composition</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>
                                Number of Children <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="childrenCount"
                                className="input-style"
                                value={localChildrenCount}
                                onChange={(e) => setLocalChildrenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Number of Household Members <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="numberOfhouseholdMembers"
                                className="input-style"
                                value={localNumberOfhouseholdMembers}
                                onChange={handleHouseholdChange}
                                min="0"
                                required
                            />
                        </div>
                    </div>
                </fieldset>

                {Array.isArray(householdMembers) && householdMembers.map((member, index) => (
                    <fieldset key={index} className="border p-4 rounded-lg">
                        <legend className="font-semibold">Household Member {index + 1}</legend>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label>
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    className="input-style"
                                    value={member.firstName}
                                    onChange={(e) => handleMemberChange(index, e)}
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
                                    value={member.lastName}
                                    onChange={(e) => handleMemberChange(index, e)}
                                    required
                                />
                            </div>
                            <div>
                                <label>Middle Name</label>
                                <input
                                    type="text"
                                    name="middleName"
                                    className="input-style"
                                    value={member.middleName}
                                    onChange={(e) => handleMemberChange(index, e)}
                                />
                            </div>
                            <div>
                                <label>Middle Initial</label>
                                <input
                                    type="text"
                                    name="middleInitial"
                                    className="input-style"
                                    value={member.middleInitial}
                                    readOnly
                                />
                            </div>
                            <div>
                                <label>
                                    Relation <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="relation"
                                    className="input-style"
                                    value={member.relation}
                                    onChange={(e) => handleMemberChange(index, e)}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="Son">Son</option>
                                    <option value="Daughter">Daughter</option>
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
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label>
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="gender"
                                    className="input-style"
                                    value={member.gender}
                                    onChange={(e) => handleGenderChange(index, e)}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {member.gender === "Other" && (
                                <div>
                                    <label>Specify Gender</label>
                                    <input
                                        type="text"
                                        name="customGender"
                                        className="input-style"
                                        value={member.customGender}
                                        onChange={(e) => handleMemberChange(index, e)}
                                    />
                                </div>
                            )}
                            <div>
                                <label>
                                    Date of Birth <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="dob"
                                    className="input-style"
                                    value={member.dob}
                                    onChange={(e) => handleMemberChange(index, e)}
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
                                    value={member.age}
                                    onChange={(e) => handleMemberChange(index, e)}
                                    min="0"
                                    required
                                />
                            </div>
                            <div>
                                <label>
                                    Education <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="education"
                                    className="input-style"
                                    value={member.education}
                                    onChange={(e) => handleMemberChange(index, e)}
                                    required
                                >
                                    <option value="" disabled>Select</option>
                                    <option value="None">None</option>
                                    <option value="Elementary">Elementary</option>
                                    <option value="High School">High School</option>
                                    <option value="College">College</option>
                                    <option value="Vocational">Vocational</option>
                                </select>
                            </div>
                            <div>
                                <label>Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    className="input-style"
                                    value={member.occupation}
                                    onChange={(e) => handleMemberChange(index, e)}
                                />
                            </div>
                        </div>
                    </fieldset>
                ))}

                <div className="flex justify-between mt-4">
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                        onClick={onBack}
                    >
                        Back
                    </button>
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

export default HouseholdComposition;