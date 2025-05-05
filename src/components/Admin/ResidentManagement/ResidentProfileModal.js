import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { capitalizeWords } from './Utils';

const ResidentProfileModal = ({ isOpen, resident, addressMappings, onClose, zIndex }) => {
    const [activeProfileTab, setActiveProfileTab] = useState(0);

    const modalVariants = {
        hidden: { opacity: 0, y: -50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 0.5, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
    };

    if (!isOpen || !resident) return null;

    return (
        <AnimatePresence>
            <>
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-60"
                    style={{ zIndex: zIndex - 10 }}
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                />
                <motion.div
                    className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                    style={{ zIndex }}
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Resident Profile Details</h2>
                            <motion.button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-800 transition-colors duration-200"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Close modal"
                            >
                                <FaTimes size={24} />
                            </motion.button>
                        </div>
                        <div className="bg-gray-100 border-b border-gray-200">
                            <div className="flex flex-wrap gap-3 p-6">
                                {['Household Head', 'Spouse', 'Household Composition', 'Census Questions'].map((tab, index) => (
                                    <button
                                        key={index}
                                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeProfileTab === index
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-200 hover:text-emerald-600'
                                            }`}
                                        onClick={() => setActiveProfileTab(index)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {activeProfileTab === 0 && (
                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <legend className="text-lg font-semibold text-gray-800 px-2">Household Head</legend>
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="relative w-36 h-36 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-md">
                                                {resident.profileImageUrl ? (
                                                    <img
                                                        src={resident.profileImageUrl}
                                                        alt={`${resident.firstName} ${resident.lastName}`}
                                                        className="w-full h-full rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 ${resident.profileImageUrl ? 'hidden' : ''}`}
                                                >
                                                    {resident.firstName.charAt(0).toUpperCase()}
                                                    {resident.lastName.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {[
                                                'firstName',
                                                'middleName',
                                                'lastName',
                                                'address',
                                                'region',
                                                'province',
                                                'city',
                                                'barangay',
                                                'zone',
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
                                            ].map((key) => {
                                                let label = capitalizeWords(key);
                                                if (key === 'dob') label = 'Date of Birth';
                                                if (key === 'idType') label = 'ID Type';
                                                if (key === 'idNo') label = 'ID Number';
                                                if (key === 'zone') label = 'Purok/Zone';
                                                return (
                                                    <div key={key} className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700">{label}</label>
                                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                ? addressMappings[key][resident.householdData[key]] || 'N/A'
                                                                : resident.householdData[key] || 'N/A'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </fieldset>
                            )}
                            {activeProfileTab === 1 && (
                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <legend className="text-lg font-semibold text-gray-800 px-2">Spouse</legend>
                                    {resident.spouseData ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {[
                                                'firstName',
                                                'middleName',
                                                'lastName',
                                                'address',
                                                'region',
                                                'province',
                                                'city',
                                                'barangay',
                                                'zone',
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
                                            ].map((key) => {
                                                let label = capitalizeWords(key);
                                                if (key === 'dob') label = 'Date of Birth';
                                                if (key === 'idType') label = 'ID Type';
                                                if (key === 'idNo') label = 'ID Number';
                                                if (key === 'zone') label = 'Purok/Zone';
                                                return (
                                                    <div key={key} className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700">{label}</label>
                                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                ? addressMappings[key][resident.spouseData[key]] || 'N/A'
                                                                : resident.spouseData[key] || 'N/A'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No spouse data available.</p>
                                    )}
                                </fieldset>
                            )}
                            {activeProfileTab === 2 && (
                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <legend className="text-lg font-semibold text-gray-800 px-2">Household Composition</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Number of Children</label>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                {resident.childrenCount || 0}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Number of Other Household Members</label>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                                                {resident.numberOfHouseholdMembers || 0}
                                            </div>
                                        </div>
                                    </div>
                                    {resident.childrenCount > 0 && (
                                        <div className="border-t border-gray-200 pt-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Children</h3>
                                            {resident.householdComposition
                                                .filter((member) => member.relation === 'Son' || member.relation === 'Daughter')
                                                .map((member, index) => (
                                                    <div key={`child-${index}`} className="bg-gray-50 p-5 rounded-xl shadow-sm mb-4 border border-gray-200">
                                                        <h4 className="text-md font-semibold text-gray-800 mb-3">Child {index + 1}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            {[
                                                                'firstName',
                                                                'middleName',
                                                                'middleInitial',
                                                                'lastName',
                                                                'relation',
                                                                'gender',
                                                                'customGender',
                                                                'age',
                                                                'dob',
                                                                'education',
                                                                'occupation',
                                                                'isLivingWithParents',
                                                                ...(member.isLivingWithParents === 'No'
                                                                    ? ['address', 'region', 'province', 'city', 'barangay', 'zipCode', 'zone']
                                                                    : []),
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'customGender') label = 'Custom Gender';
                                                                if (key === 'isLivingWithParents') label = 'Is Living with Parents';
                                                                if (key === 'zone') label = 'Purok/Zone';
                                                                return (
                                                                    <div key={key} className="space-y-1">
                                                                        <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                        <div className="bg-white p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                            {['region', 'province', 'city', 'barangay'].includes(key)
                                                                                ? addressMappings[key][member[key]] || 'N/A'
                                                                                : member[key] || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                    {resident.numberOfHouseholdMembers > 0 && (
                                        <div className="border-t border-gray-200 pt-6">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Household Members</h3>
                                            {resident.householdComposition
                                                .filter((member) => member.relation !== 'Son' && member.relation !== 'Daughter')
                                                .map((member, index) => (
                                                    <div key={`member-${index}`} className="bg-gray-50 p-5 rounded-xl shadow-sm mb-4 border border-gray-200">
                                                        <h4 className="text-md font-semibold text-gray-800 mb-3">Member {index + 1}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            {[
                                                                'firstName',
                                                                'middleName',
                                                                'middleInitial',
                                                                'lastName',
                                                                'relation',
                                                                'gender',
                                                                'customGender',
                                                                'age',
                                                                'dob',
                                                                'education',
                                                                'occupation',
                                                            ].map((key) => {
                                                                let label = capitalizeWords(key);
                                                                if (key === 'dob') label = 'Date of Birth';
                                                                if (key === 'customGender') label = 'Custom Gender';
                                                                return (
                                                                    <div key={key} className="space-y-1">
                                                                        <label className="text-sm font-medium text-gray-700">{label}</label>
                                                                        <div className="bg-white p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                                            {member[key] || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                    {resident.childrenCount === 0 && resident.numberOfHouseholdMembers === 0 && (
                                        <p className="text-sm text-gray-500 italic">No household members or children added.</p>
                                    )}
                                </fieldset>
                            )}
                            {activeProfileTab === 3 && (
                                <fieldset className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <legend className="text-lg font-semibold text-gray-800 px-2">Census Questions</legend>
                                    {resident.censusData && Object.keys(resident.censusData).length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {[
                                                { key: 'ownsHouse', label: 'Owns House' },
                                                { key: 'isRenting', label: 'Is Renting' },
                                                { key: 'yearsInBarangay', label: 'Years in Barangay' },
                                                { key: 'isRegisteredVoter', label: 'Registered Voter' },
                                                { key: 'voterPrecinctNo', label: 'Voter Precinct Number' },
                                                { key: 'hasOwnComfortRoom', label: 'Own Comfort Room' },
                                                { key: 'hasOwnWaterSupply', label: 'Own Water Supply' },
                                                { key: 'hasOwnElectricity', label: 'Own Electricity' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">{label}</label>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 capitalize text-sm">
                                                        {resident.censusData[key] || 'N/A'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No census data available.</p>
                                    )}
                                </fieldset>
                            )}
                        </div>
                    </div>
                </motion.div>
            </>
        </AnimatePresence>
    );
};

export default ResidentProfileModal;