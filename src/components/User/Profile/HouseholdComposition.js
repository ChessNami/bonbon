import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabaseClient';

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

    // Fetch household composition data from Supabase
    const fetchUserData = useCallback(async () => {
        if (!userId) {
            console.log('No userId provided, skipping fetch.');
            return;
        }

        const { data, error } = await supabase
            .from('residents')
            .select('household_composition, children_count, number_of_household_members')
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
                }));
            const otherMembers = composition
                .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                .map((member) => ({
                    ...member,
                    age: member.dob ? calculateAge(member.dob) : member.age || '',
                }));
            setChildren(childMembers);
            setHouseholdMembers(otherMembers);
            setLocalChildrenCount(data.children_count || 0);
            setLocalNumberOfhouseholdMembers(data.number_of_household_members || 0);
        } else if (error) {
            console.error('Error fetching household composition:', error);
            setChildren([]);
            setHouseholdMembers([]);
            setLocalChildrenCount(0);
            setLocalNumberOfhouseholdMembers(0);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

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
                    });
                }
                return newChildren.slice(0, localChildrenCount).map((child) => ({
                    ...child,
                    age: child.dob ? calculateAge(child.dob) : child.age || '',
                }));
            });
        } else {
            setChildren([]);
        }
    }, [localChildrenCount]);

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
                    });
                }
                return newHousehold.slice(0, localNumberOfhouseholdMembers).map((member) => ({
                    ...member,
                    age: member.dob ? calculateAge(member.dob) : member.age || '',
                }));
            });
        } else {
            setHouseholdMembers([]);
        }
    }, [localNumberOfhouseholdMembers]);

    const handleChildrenCountChange = (e) => {
        const count = Math.max(0, parseInt(e.target.value, 10) || 0);
        setLocalChildrenCount(count);
    };

    const handleHouseholdChange = (e) => {
        const count = Math.max(0, parseInt(e.target.value, 10) || 0);
        setLocalNumberOfhouseholdMembers(count);
    };

    const handleChildChange = (index, e) => {
        const { name, value } = e.target;
        setChildren((prev) => {
            const updatedChildren = Array.isArray(prev) ? [...prev] : [];
            updatedChildren[index] = { ...updatedChildren[index], [name]: value };
            if (name === 'middleName') {
                updatedChildren[index].middleInitial = value ? value.charAt(0).toUpperCase() : '';
            }
            if (name === 'relation') {
                updatedChildren[index].gender = value === 'Son' ? 'Male' : value === 'Daughter' ? 'Female' : updatedChildren[index].gender;
                updatedChildren[index].customGender = value !== 'Other' ? '' : updatedChildren[index].customGender;
            }
            if (name === 'dob') {
                updatedChildren[index].age = calculateAge(value);
            }
            return updatedChildren;
        });
    };

    const handleMemberChange = (index, e) => {
        const { name, value } = e.target;
        setHouseholdMembers((prev) => {
            const updatedMembers = Array.isArray(prev) ? [...prev] : [];
            updatedMembers[index] = { ...updatedMembers[index], [name]: value };
            if (name === 'middleName') {
                updatedMembers[index].middleInitial = value ? value.charAt(0).toUpperCase() : '';
            }
            if (name === 'dob') {
                updatedMembers[index].age = calculateAge(value);
            }
            return updatedMembers;
        });
    };

    const handleChildGenderChange = (index, e) => {
        const value = e.target.value;
        setChildren((prev) => {
            const updatedChildren = Array.isArray(prev) ? [...prev] : [];
            updatedChildren[index] = { ...updatedChildren[index], gender: value };
            if (value !== 'Other') updatedChildren[index].customGender = '';
            return updatedChildren;
        });
    };

    const handleMemberGenderChange = (index, e) => {
        const value = e.target.value;
        setHouseholdMembers((prev) => {
            const updatedMembers = Array.isArray(prev) ? [...prev] : [];
            updatedMembers[index] = { ...updatedMembers[index], gender: value };
            if (value !== 'Other') updatedMembers[index].customGender = '';
            return updatedMembers;
        });
    };

    // Handle form submission
    const handleSubmit = async () => {
        const allMembers = [...children, ...householdMembers];
        if (allMembers.length > 0) {
            for (let member of allMembers) {
                const requiredFields = ['firstName', 'lastName', 'relation', 'gender', 'age', 'dob', 'education'];
                for (let field of requiredFields) {
                    if (!member[field]) {
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
            }
        }

        const { error } = await supabase
            .from('residents')
            .update({
                household_composition: allMembers,
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

        onNext(allMembers, 'confirmation', localChildrenCount, localNumberOfhouseholdMembers);
    };

    const handleBackClick = (e) => {
        e.preventDefault();
        if (onBack) onBack();
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
                                onChange={handleChildrenCountChange}
                                min="0"
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Number of Other Household Members <span className="text-red-500">*</span>
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

                {Array.isArray(children) && children.length > 0 && (
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="font-semibold">Children Composition</legend>
                        {children.map((child, index) => (
                            <fieldset key={`child-${index}`} className="border p-4 rounded-lg mt-4">
                                <legend className="font-semibold">Child {index + 1}</legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label>
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            className="input-style"
                                            value={child.firstName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
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
                                            value={child.lastName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label>Middle Name</label>
                                        <input
                                            type="text"
                                            name="middleName"
                                            className="input-style"
                                            value={child.middleName || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label>Middle Initial</label>
                                        <input
                                            type="text"
                                            name="middleInitial"
                                            className="input-style"
                                            value={child.middleInitial || ''}
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
                                            value={child.relation || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            required
                                        >
                                            <option value="Son">Son</option>
                                            <option value="Daughter">Daughter</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="gender"
                                            className="input-style"
                                            value={child.gender || ''}
                                            onChange={(e) => handleChildGenderChange(index, e)}
                                            required
                                        >
                                            <option value="Male" disabled={child.relation !== 'Son'}>Male</option>
                                            <option value="Female" disabled={child.relation !== 'Daughter'}>Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {child.gender === 'Other' && (
                                        <div>
                                            <label>Specify Gender</label>
                                            <input
                                                type="text"
                                                name="customGender"
                                                className="input-style"
                                                value={child.customGender || ''}
                                                onChange={(e) => handleChildChange(index, e)}
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
                                            value={child.dob || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label>
                                            Age <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="age"
                                            className="input-style"
                                            value={child.age || ''}
                                            disabled
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
                                            value={child.education || ''}
                                            onChange={(e) => handleChildChange(index, e)}
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
                                            value={child.occupation || ''}
                                            onChange={(e) => handleChildChange(index, e)}
                                        />
                                    </div>
                                </div>
                            </fieldset>
                        ))}
                    </fieldset>
                )}

                {Array.isArray(householdMembers) && householdMembers.length > 0 && (
                    <fieldset className="border p-4 rounded-lg">
                        <legend className="font-semibold">Other Household Members</legend>
                        {householdMembers.map((member, index) => (
                            <fieldset key={`member-${index}`} className="border p-4 rounded-lg mt-4">
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
                                            value={member.firstName || ''}
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
                                            value={member.lastName || ''}
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
                                            value={member.middleName || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                        />
                                    </div>
                                    <div>
                                        <label>Middle Initial</label>
                                        <input
                                            type="text"
                                            name="middleInitial"
                                            className="input-style"
                                            value={member.middleInitial || ''}
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
                                            value={member.relation || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
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
                                            value={member.gender || ''}
                                            onChange={(e) => handleMemberGenderChange(index, e)}
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
                                            <label>Specify Gender</label>
                                            <input
                                                type="text"
                                                name="customGender"
                                                className="input-style"
                                                value={member.customGender || ''}
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
                                            value={member.dob || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label>
                                            Age <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="age"
                                            className="input-style"
                                            value={member.age || ''}
                                            disabled
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
                                            value={member.education || ''}
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
                                            value={member.occupation || ''}
                                            onChange={(e) => handleMemberChange(index, e)}
                                        />
                                    </div>
                                </div>
                            </fieldset>
                        ))}
                    </fieldset>
                )}

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

HouseholdComposition.propTypes = {
    data: PropTypes.array,
    childrenCount: PropTypes.number,
    numberOfhouseholdMembers: PropTypes.number,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    userId: PropTypes.string,
};

export default HouseholdComposition;