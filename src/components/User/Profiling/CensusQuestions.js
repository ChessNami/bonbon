import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { supabase } from '../../../supabaseClient';

// Utility function to ensure years are non-negative
const validateYears = (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) || num < 0 ? '' : num.toString();
};

const CensusQuestions = ({ data, onNext, onBack, userId }) => {
    const [formData, setFormData] = useState({
        ownsHouse: data?.ownsHouse || '',
        isRenting: data?.isRenting || '',
        yearsInBarangay: data?.yearsInBarangay || '',
        isRegisteredVoter: data?.isRegisteredVoter || '',
        voterPrecinctNo: data?.voterPrecinctNo || '',
        hasOwnComfortRoom: data?.hasOwnComfortRoom || '',
        hasOwnWaterSupply: data?.hasOwnWaterSupply || '',
        hasOwnElectricity: data?.hasOwnElectricity || '',
    });

    // Fetch census data from Supabase
    const fetchCensusData = useCallback(async () => {
        if (!userId) {
            console.log('No userId provided, skipping fetch.');
            return;
        }

        try {
            const { data: residentData, error } = await supabase
                .from('residents')
                .select('census')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching census data:', error.message);
                return;
            }

            if (residentData?.census) {
                setFormData(residentData.census);
            }
        } catch (error) {
            console.error('Unexpected error fetching census data:', error.message);
        }
    }, [userId]);

    useEffect(() => {
        fetchCensusData();
    }, [fetchCensusData]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updatedData = { ...prev };
            if (name === 'ownsHouse') {
                updatedData.ownsHouse = value;
                updatedData.isRenting = value === 'Yes' ? 'No' : updatedData.isRenting;
            } else if (name === 'isRenting') {
                updatedData.isRenting = value;
                updatedData.ownsHouse = value === 'Yes' ? 'No' : updatedData.ownsHouse;
            } else if (name === 'isRegisteredVoter') {
                updatedData.isRegisteredVoter = value;
                if (value === 'No') {
                    updatedData.voterPrecinctNo = '';
                }
            } else {
                updatedData[name] = name === 'yearsInBarangay' ? validateYears(value) : value;
            }
            return updatedData;
        });
    };

    // Handle form submission
    const handleSubmit = async () => {
        const requiredFields = [
            'ownsHouse',
            'isRenting',
            'yearsInBarangay',
            'isRegisteredVoter',
            'hasOwnComfortRoom',
            'hasOwnWaterSupply',
            'hasOwnElectricity',
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

        if (formData.isRegisteredVoter === 'Yes' && !formData.voterPrecinctNo) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Please provide the Voter’s Precinct Number',
                timer: 1500,
                showConfirmButton: false,
            });
            return;
        }

        try {
            const { error } = await supabase
                .from('residents')
                .update({ census: formData })
                .eq('user_id', userId);

            if (error) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: `Failed to save census data: ${error.message}`,
                    timer: 1500,
                    showConfirmButton: false,
                });
                return;
            }

            onNext(formData, 'confirmation');
        } catch (error) {
            console.error('Unexpected error:', error);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: `An unexpected error occurred: ${error.message || 'Unknown error'}`,
                timer: 1500,
                showConfirmButton: false,
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
                    <legend className="font-semibold text-sm sm:text-base">Household Census Questions</legend>
                    <div className="space-y-4 sm:space-y-6">
                        {/* Question 1: Own the house */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                1. Do you own the house you are living in? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2 gap-2 sm:gap-0">
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="ownsHouse"
                                        value="Yes"
                                        checked={formData.ownsHouse === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="ownsHouse"
                                        value="No"
                                        checked={formData.ownsHouse === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    No
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="isRenting"
                                        value="Yes"
                                        checked={formData.isRenting === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Renting
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="isRenting"
                                        value="No"
                                        checked={formData.isRenting === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Not Renting
                                </label>
                            </div>
                        </div>

                        {/* Question 2: Years in Barangay Bonbon */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                2. How long have you been staying in Barangay Bonbon? <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="yearsInBarangay"
                                value={formData.yearsInBarangay || ''}
                                onChange={handleChange}
                                className="input-style mt-2 w-full sm:w-32 text-sm sm:text-base"
                                placeholder="Enter years"
                                min="0"
                                required
                            />
                        </div>

                        {/* Question 3: Registered voter */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                3. Are you a registered voter in Barangay Bonbon? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2 gap-2 sm:gap-0">
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="isRegisteredVoter"
                                        value="Yes"
                                        checked={formData.isRegisteredVoter === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="isRegisteredVoter"
                                        value="No"
                                        checked={formData.isRegisteredVoter === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    No
                                </label>
                            </div>
                            {formData.isRegisteredVoter === 'Yes' && (
                                <div className="mt-2">
                                    <label className="block text-sm sm:text-base font-medium">
                                        Voter’s Precinct No. <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="voterPrecinctNo"
                                        value={formData.voterPrecinctNo || ''}
                                        onChange={handleChange}
                                        className="input-style mt-1 w-full sm:w-48 text-sm sm:text-base"
                                        placeholder="Enter precinct number"
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {/* Question 4: Own Comfort Room */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                4. Do you have your own Comfort Room (C.R.)? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2 gap-2 sm:gap-0">
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnComfortRoom"
                                        value="Yes"
                                        checked={formData.hasOwnComfortRoom === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnComfortRoom"
                                        value="No"
                                        checked={formData.hasOwnComfortRoom === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    No
                                </label>
                            </div>
                        </div>

                        {/* Question 5: Own water supply */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                5. Do you have your own source of water supply? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2 gap-2 sm:gap-0">
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnWaterSupply"
                                        value="Yes"
                                        checked={formData.hasOwnWaterSupply === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnWaterSupply"
                                        value="No"
                                        checked={formData.hasOwnWaterSupply === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    No
                                </label>
                            </div>
                        </div>

                        {/* Question 6: Own electricity */}
                        <div>
                            <label className="block text-sm sm:text-base font-medium">
                                6. Do you have your own electricity? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2 gap-2 sm:gap-0">
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnElectricity"
                                        value="Yes"
                                        checked={formData.hasOwnElectricity === 'Yes'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    Yes
                                </label>
                                <label className="flex items-center text-sm sm:text-base">
                                    <input
                                        type="radio"
                                        name="hasOwnElectricity"
                                        value="No"
                                        checked={formData.hasOwnElectricity === 'No'}
                                        onChange={handleChange}
                                        className="mr-2 h-5 w-5"
                                    />
                                    No
                                </label>
                            </div>
                        </div>
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
                                // Check if census data exists
                                const { data: residentData, error: fetchError } = await supabase
                                    .from('residents')
                                    .select('census')
                                    .eq('user_id', userId)
                                    .maybeSingle(); // Use maybeSingle to handle no rows gracefully

                                if (fetchError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error checking census data: ${fetchError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // If no resident data or no census data exists
                                if (!residentData || !residentData.census) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'info',
                                        title: 'No census data to clear',
                                        text: 'The census data is already empty.',
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Confirm deletion if census data exists
                                const result = await Swal.fire({
                                    title: 'Are you sure?',
                                    text: 'This will clear all census data. This action cannot be undone.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#d33',
                                    cancelButtonColor: '#3085d6',
                                    confirmButtonText: 'Yes, clear it!',
                                    scrollbarPadding: false,
                                });

                                if (!result.isConfirmed) return;

                                // Clear census data
                                const { error: updateError } = await supabase
                                    .from('residents')
                                    .update({ census: null })
                                    .eq('user_id', userId);

                                if (updateError) {
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'error',
                                        title: `Error clearing census data: ${updateError.message}`,
                                        timer: 1500,
                                        showConfirmButton: false,
                                        scrollbarPadding: false,
                                    });
                                    return;
                                }

                                // Reset form state
                                setFormData({
                                    ownsHouse: '',
                                    isRenting: '',
                                    yearsInBarangay: '',
                                    isRegisteredVoter: '',
                                    voterPrecinctNo: '',
                                    hasOwnComfortRoom: '',
                                    hasOwnWaterSupply: '',
                                    hasOwnElectricity: '',
                                });

                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'success',
                                    title: 'Census data cleared successfully',
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

CensusQuestions.propTypes = {
    data: PropTypes.object,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    userId: PropTypes.string,
};

export default CensusQuestions;