import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../supabaseClient";
import { ClipLoader } from "react-spinners";
import { FaTimes, FaArrowLeft, FaInfoCircle, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
    }),
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 },
};

const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const modalVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -50 },
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.6, transition: { duration: 0.3 } },
};

const COLORS = {
    yes: "#10b981",
    no: "#ef4444",
    male: "#4f46e5",
    female: "#10b981",
    other: "#f59e0b",
};

const ITEMS_PER_PAGE = 20; // Adjustable page size

const Demographics = () => {
    const [totalResidents, setTotalResidents] = useState(0);
    const [totalHouseholds, setTotalHouseholds] = useState(0);
    const [maleCount, setMaleCount] = useState(0);
    const [femaleCount, setFemaleCount] = useState(0);
    const [seniorCitizens, setSeniorCitizens] = useState(0);
    const [ageData, setAgeData] = useState([]);
    const [genderData, setGenderData] = useState([]);
    const [zoneSeniorData, setZoneSeniorData] = useState({});
    const [zonePopulationData, setZonePopulationData] = useState({});
    const [zoneGenderData, setZoneGenderData] = useState({});
    const [zoneResidentNames, setZoneResidentNames] = useState({});
    const [zoneMaleNames, setZoneMaleNames] = useState({});
    const [zoneFemaleNames, setZoneFemaleNames] = useState({});
    const [zoneSeniorNames, setZoneSeniorNames] = useState({});
    const [censusData, setCensusData] = useState({
        isRenting: { Yes: 0, No: 0 },
        ownsHouse: { Yes: 0, No: 0 },
        hasOwnComfortRoom: { Yes: 0, No: 0 },
        hasOwnElectricity: { Yes: 0, No: 0 },
        hasOwnWaterSupply: { Yes: 0, No: 0 },
        isRegisteredVoter: { Yes: 0, No: 0 },
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [seniorModalOpen, setSeniorModalOpen] = useState(false);
    const [populationModalOpen, setPopulationModalOpen] = useState(false);
    const [genderModalOpen, setGenderModalOpen] = useState(false);
    const [selectedPopulationZone, setSelectedPopulationZone] = useState(null);
    const [selectedGenderZone, setSelectedGenderZone] = useState(null);
    const [selectedSeniorZone, setSelectedSeniorZone] = useState(null);

    const calculateAge = useCallback((dob, providedAge) => {
        if (providedAge !== null && providedAge !== undefined) {
            if (typeof providedAge === "number") return providedAge;
            if (typeof providedAge === "string") {
                const ageNum = parseInt(providedAge.replace(" years old", ""));
                if (!isNaN(ageNum)) return ageNum;
            }
        }
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            return age;
        }
        return 0;
    }, []);

    const calculateTotalResidents = useCallback((residents) => {
        let total = 0;
        residents.forEach((resident) => {
            total += 1;
            if (resident.spouse && Object.keys(resident.spouse).length > 0) total += 1;
            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") composition = JSON.parse(composition);
                    composition.forEach((member) => {
                        if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) total += 1;
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });
        return total;
    }, []);

    const fetchDemographics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("residents")
                .select(`
                    household,
                    spouse,
                    household_composition,
                    census,
                    resident_profile_status!inner(status)
                `)
                .eq("resident_profile_status.status", 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                setTotalResidents(0);
                setTotalHouseholds(0);
                setAgeData([]);
                setGenderData([]);
                setMaleCount(0);
                setFemaleCount(0);
                setSeniorCitizens(0);
                setZoneSeniorData({});
                setZonePopulationData({});
                setZoneGenderData({});
                setZoneResidentNames({});
                setZoneMaleNames({});
                setZoneFemaleNames({});
                setZoneSeniorNames({});
                setCensusData({
                    isRenting: { Yes: 0, No: 0 },
                    ownsHouse: { Yes: 0, No: 0 },
                    hasOwnComfortRoom: { Yes: 0, No: 0 },
                    hasOwnElectricity: { Yes: 0, No: 0 },
                    hasOwnWaterSupply: { Yes: 0, No: 0 },
                    isRegisteredVoter: { Yes: 0, No: 0 },
                });
                return;
            }

            let male = 0, female = 0, other = 0;
            let age18Below = 0, age18Above = 0, seniors = 0;

            const zoneSeniorDataTemp = {};
            const zonePopulationDataTemp = {};
            const zoneGenderDataTemp = {};
            const zoneResNamesTemp = {};
            const zoneMaleNamesTemp = {};
            const zoneFemaleNamesTemp = {};
            const zoneSeniorNamesTemp = {};
            const tempCensus = {
                isRenting: { Yes: 0, No: 0 },
                ownsHouse: { Yes: 0, No: 0 },
                hasOwnComfortRoom: { Yes: 0, No: 0 },
                hasOwnElectricity: { Yes: 0, No: 0 },
                hasOwnWaterSupply: { Yes: 0, No: 0 },
                isRegisteredVoter: { Yes: 0, No: 0 },
            };

            for (let i = 1; i <= 9; i++) {
                zoneSeniorDataTemp[i] = { count: 0 };
                zonePopulationDataTemp[i] = { count: 0 };
                zoneGenderDataTemp[i] = { male: 0, female: 0 };
                zoneResNamesTemp[i] = [];
                zoneMaleNamesTemp[i] = [];
                zoneFemaleNamesTemp[i] = [];
                zoneSeniorNamesTemp[i] = [];
            }

            data.forEach((resident) => {
                const household = resident.household;
                const headAge = calculateAge(household.dob, household.age);
                const headGender = household.customGender || household.gender;
                const zoneStr = household.zone || null;
                const zone = zoneStr ? parseInt(zoneStr.replace(/[^0-9]/g, '')) : null;

                const headLast = (household.lastName || "").trim();
                const headFirst = (household.firstName || "").trim();
                const headMiddle = (household.middleName || "").trim();
                const headName = headLast
                    ? `${headLast}, ${headFirst} ${headMiddle}`.trim().replace(/\s+/g, " ")
                    : "Unnamed Resident";

                // Population & Gender per zone
                if (zone && zone in zonePopulationDataTemp) {
                    zonePopulationDataTemp[zone].count += 1;
                    zoneResNamesTemp[zone].push(headName);
                    if (headGender === "Male") {
                        zoneGenderDataTemp[zone].male += 1;
                        zoneMaleNamesTemp[zone].push(headName);
                    } else if (headGender === "Female") {
                        zoneGenderDataTemp[zone].female += 1;
                        zoneFemaleNamesTemp[zone].push(headName);
                    }
                }

                if (headGender === "Male") male += 1;
                else if (headGender === "Female") female += 1;
                else other += 1;

                if (headAge <= 18) age18Below += 1;
                else age18Above += 1;
                if (headAge >= 60) {
                    seniors += 1;
                    if (zone) {
                        zoneSeniorDataTemp[zone].count += 1;
                        zoneSeniorNamesTemp[zone].push(headName);
                    }
                }

                // Spouse
                if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                    const spouse = resident.spouse;
                    const spouseAge = calculateAge(spouse.dob, spouse.age);
                    const spouseGender = spouse.customGender || spouse.gender;

                    const spouseLast = (spouse.lastName || "").trim();
                    const spouseFirst = (spouse.firstName || "").trim();
                    const spouseMiddle = (spouse.middleName || "").trim();
                    const spouseName = spouseLast
                        ? `${spouseLast}, ${spouseFirst} ${spouseMiddle}`.trim().replace(/\s+/g, " ")
                        : "Unnamed Spouse";

                    if (zone && zone in zonePopulationDataTemp) {
                        zonePopulationDataTemp[zone].count += 1;
                        zoneResNamesTemp[zone].push(spouseName);
                        if (spouseGender === "Male") {
                            zoneGenderDataTemp[zone].male += 1;
                            zoneMaleNamesTemp[zone].push(spouseName);
                        } else if (spouseGender === "Female") {
                            zoneGenderDataTemp[zone].female += 1;
                            zoneFemaleNamesTemp[zone].push(spouseName);
                        }
                    }

                    if (spouseGender === "Male") male += 1;
                    else if (spouseGender === "Female") female += 1;

                    if (spouseAge <= 18) age18Below += 1;
                    else age18Above += 1;
                    if (spouseAge >= 60) {
                        seniors += 1;
                        if (zone) {
                            zoneSeniorDataTemp[zone].count += 1;
                            zoneSeniorNamesTemp[zone].push(spouseName);
                        }
                    }
                }

                // Household composition
                if (resident.household_composition) {
                    try {
                        let composition = resident.household_composition;
                        if (typeof composition === "string") composition = JSON.parse(composition);
                        composition.forEach((member) => {
                            if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                                const memberAge = calculateAge(member.dob, member.age);
                                const memberGender = member.customGender || member.gender;

                                const memberLast = (member.lastName || "").trim();
                                const memberFirst = (member.firstName || "").trim();
                                const memberMiddle = (member.middleName || "").trim();
                                const memberName = memberLast
                                    ? `${memberLast}, ${memberFirst} ${memberMiddle}`.trim().replace(/\s+/g, " ")
                                    : "Unnamed Member";

                                if (zone && zone in zonePopulationDataTemp) {
                                    zonePopulationDataTemp[zone].count += 1;
                                    zoneResNamesTemp[zone].push(memberName);
                                    if (memberGender === "Male") {
                                        zoneGenderDataTemp[zone].male += 1;
                                        zoneMaleNamesTemp[zone].push(memberName);
                                    } else if (memberGender === "Female") {
                                        zoneGenderDataTemp[zone].female += 1;
                                        zoneFemaleNamesTemp[zone].push(memberName);
                                    }
                                }

                                if (memberGender === "Male") male += 1;
                                else if (memberGender === "Female") female += 1;

                                if (memberAge <= 18) age18Below += 1;
                                else age18Above += 1;
                                if (memberAge >= 60) {
                                    seniors += 1;
                                    if (zone) {
                                        zoneSeniorDataTemp[zone].count += 1;
                                        zoneSeniorNamesTemp[zone].push(memberName);
                                    }
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Error parsing household_composition:", e);
                    }
                }

                // Census
                if (resident.census) {
                    let census;
                    try {
                        census = typeof resident.census === "string" ? JSON.parse(resident.census) : resident.census;
                    } catch (e) {
                        console.error("Error parsing census:", e);
                        census = {};
                    }

                    const countYesNo = (field) => {
                        if (census[field] === "Yes") tempCensus[field].Yes++;
                        else if (census[field] === "No") tempCensus[field].No++;
                    };

                    countYesNo("isRenting");
                    countYesNo("ownsHouse");
                    countYesNo("hasOwnComfortRoom");
                    countYesNo("hasOwnElectricity");
                    countYesNo("hasOwnWaterSupply");
                    countYesNo("isRegisteredVoter");
                }
            });

            // Sort by last name
            for (let i = 1; i <= 9; i++) {
                const sortNames = (arr) => {
                    arr.sort((a, b) => {
                        if (a.startsWith("Unnamed")) return 1;
                        if (b.startsWith("Unnamed")) return -1;
                        const lastA = a.split(",")[0].trim();
                        const lastB = b.split(",")[0].trim();
                        if (lastA !== lastB) return lastA.localeCompare(lastB);
                        return a.localeCompare(b);
                    });
                };

                sortNames(zoneResNamesTemp[i]);
                sortNames(zoneMaleNamesTemp[i]);
                sortNames(zoneFemaleNamesTemp[i]);
                sortNames(zoneSeniorNamesTemp[i]);
            }

            setTotalResidents(calculateTotalResidents(data));
            setTotalHouseholds(data.length);
            setMaleCount(male);
            setFemaleCount(female);
            setSeniorCitizens(seniors);
            setZoneSeniorData(zoneSeniorDataTemp);
            setZonePopulationData(zonePopulationDataTemp);
            setZoneGenderData(zoneGenderDataTemp);
            setZoneResidentNames(zoneResNamesTemp);
            setZoneMaleNames(zoneMaleNamesTemp);
            setZoneFemaleNames(zoneFemaleNamesTemp);
            setZoneSeniorNames(zoneSeniorNamesTemp);
            setCensusData(tempCensus);

            setAgeData([
                { ageGroup: "Below 18", count: age18Below },
                { ageGroup: "18 and Above", count: age18Above },
            ]);

            setGenderData([
                { category: "Residents", male, female, other },
            ]);

        } catch (err) {
            setError("Failed to fetch demographic data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [calculateAge, calculateTotalResidents]);

    useEffect(() => {
        fetchDemographics();
    }, [fetchDemographics]);

    const closeSeniorModal = () => { setSeniorModalOpen(false); setSelectedSeniorZone(null); };
    const closePopulationModal = () => { setPopulationModalOpen(false); setSelectedPopulationZone(null); };
    const closeGenderModal = () => { setGenderModalOpen(false); setSelectedGenderZone(null); };
    const goBackToGenderZones = () => setSelectedGenderZone(null);
    const goBackToPopulationZones = () => setSelectedPopulationZone(null);
    const goBackToSeniorZones = () => setSelectedSeniorZone(null);

    const getPieData = (yes, no) => [
        { name: "Yes", value: yes },
        { name: "No", value: no },
    ].filter(d => d.value > 0);

    // Paginated Name List Component
    const PaginatedNameList = ({ names, title }) => {
        const [search, setSearch] = useState('');
        const [page, setPage] = useState(1);

        const filtered = names.filter(name =>
            name.toLowerCase().includes(search.toLowerCase())
        );

        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const startIdx = (page - 1) * ITEMS_PER_PAGE;
        const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {title} ({filtered.length} total)
                </h4>
                <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search names..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="max-h-96 overflow-y-auto mb-4">
                    {paginated.length > 0 ? (
                        <ul className="space-y-2">
                            {paginated.map((name, index) => (
                                <li key={index} className="py-2 px-3 bg-gray-50 rounded-lg text-gray-700">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No names found</p>
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaChevronLeft />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
                    <ClipLoader color="#4f46e5" size={60} />
                </div>
            )}

            <div className="mb-10 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" size={22} />
                <p className="text-sm text-blue-900">
                    <strong>Note:</strong> All data is based exclusively on <strong>approved</strong> resident profiles. Pending or rejected profiles are excluded.
                </p>
            </div>

            {error ? (
                <div className="text-center text-red-600 text-xl">{error}</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-12">
                        {[
                            { title: "Total Population", value: totalResidents.toLocaleString(), color: "from-indigo-500 to-indigo-600", modal: "population" },
                            { title: "Households", value: totalHouseholds.toLocaleString(), color: "from-green-500 to-emerald-600" },
                            { title: "Males", value: maleCount.toLocaleString(), color: "from-blue-500 to-blue-600", modal: "gender" },
                            { title: "Females", value: femaleCount.toLocaleString(), color: "from-teal-500 to-teal-600", modal: "gender" },
                            { title: "Senior Citizens", value: seniorCitizens.toLocaleString(), color: "from-purple-500 to-purple-600", modal: "senior" },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                whileTap="tap"
                                className={`bg-gradient-to-br ${stat.color} text-white p-6 rounded-2xl shadow-lg text-center cursor-pointer transform transition-all`}
                                onClick={() => stat.modal === "senior" ? setSeniorModalOpen(true) :
                                    stat.modal === "population" ? setPopulationModalOpen(true) :
                                        stat.modal === "gender" ? setGenderModalOpen(true) : null}
                            >
                                <p className="text-sm font-medium uppercase tracking-wider opacity-90">{stat.title}</p>
                                <p className="text-4xl font-bold mt-3">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <motion.div variants={chartVariants} initial="hidden" animate="visible" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Population by Age Group</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={ageData}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                                    <XAxis dataKey="ageGroup" tick={{ fill: "#555" }} />
                                    <YAxis tick={{ fill: "#555" }} />
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        <motion.div variants={chartVariants} initial="hidden" animate="visible" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Gender Distribution</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={genderData}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                                    <XAxis dataKey="category" tick={{ fill: "#555" }} />
                                    <YAxis tick={{ fill: "#555" }} />
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                                    <Legend />
                                    <Bar dataKey="male" fill={COLORS.male} radius={[12, 12, 0, 0]} />
                                    <Bar dataKey="female" fill={COLORS.female} radius={[12, 12, 0, 0]} />
                                    <Bar dataKey="other" fill={COLORS.other} radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">Census Survey Insights</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: "Registered Voters", field: "isRegisteredVoter" },
                                { title: "Owns House", field: "ownsHouse" },
                                { title: "Renting", field: "isRenting" },
                                { title: "Own Comfort Room", field: "hasOwnComfortRoom" },
                                { title: "Own Electricity", field: "hasOwnElectricity" },
                                { title: "Own Water Supply", field: "hasOwnWaterSupply" },
                            ].map((item, i) => {
                                const data = getPieData(censusData[item.field].Yes, censusData[item.field].No);
                                const total = data.reduce((sum, d) => sum + d.value, 0);
                                if (total === 0) return null;

                                return (
                                    <motion.div
                                        key={item.field}
                                        custom={i}
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
                                    >
                                        <h4 className="text-xl font-semibold text-gray-800 text-center mb-6">{item.title}</h4>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.name === "Yes" ? COLORS.yes : COLORS.no} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 text-center text-sm text-gray-600">
                                            Total Responses: <strong>{total}</strong>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Senior Citizens Modal */}
            <AnimatePresence>
                {seniorModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closeSeniorModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-2xl">
                                    <div className="flex items-center gap-4">
                                        {selectedSeniorZone !== null && (
                                            <button onClick={goBackToSeniorZones} className="hover:bg-purple-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedSeniorZone === null ? "Senior Citizens per Zone" : `Senior Citizens in Zone ${selectedSeniorZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closeSeniorModal} className="hover:bg-purple-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {selectedSeniorZone === null ? (
                                            <motion.div key="senior-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zoneSeniorData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-purple-600 text-white p-8 rounded-2xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:bg-purple-700"
                                                        onClick={() => setSelectedSeniorZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <p className="text-5xl font-bold mt-4">{data.count}</p>
                                                        <p className="text-sm mt-2 opacity-90">Senior citizens</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="senior-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                                                <p className="text-5xl font-bold text-purple-600 text-center mb-4">{zoneSeniorData[selectedSeniorZone].count}</p>
                                                <p className="text-xl text-gray-700 text-center mb-8">Senior citizens in Zone {selectedSeniorZone}</p>
                                                <PaginatedNameList names={zoneSeniorNames[selectedSeniorZone] || []} title="Senior Citizens" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Population Modal */}
            <AnimatePresence>
                {populationModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closePopulationModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-2xl">
                                    <div className="flex items-center gap-4">
                                        {selectedPopulationZone !== null && (
                                            <button onClick={goBackToPopulationZones} className="hover:bg-indigo-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedPopulationZone === null ? "Population per Zone" : `Population in Zone ${selectedPopulationZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closePopulationModal} className="hover:bg-indigo-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {selectedPopulationZone === null ? (
                                            <motion.div key="pop-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zonePopulationData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-indigo-600 text-white p-8 rounded-2xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:bg-indigo-700"
                                                        onClick={() => setSelectedPopulationZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <p className="text-5xl font-bold mt-4">{data.count}</p>
                                                        <p className="text-sm mt-2 opacity-90">Total residents</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="pop-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                                                <p className="text-5xl font-bold text-indigo-600 text-center mb-4">{zonePopulationData[selectedPopulationZone].count}</p>
                                                <p className="text-xl text-gray-700 text-center mb-8">Total residents in Zone {selectedPopulationZone}</p>
                                                <PaginatedNameList names={zoneResidentNames[selectedPopulationZone] || []} title="Residents" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Gender by Zone Modal */}
            <AnimatePresence>
                {genderModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closeGenderModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-t-2xl">
                                    <div className="flex items-center gap-4">
                                        {selectedGenderZone !== null && (
                                            <button onClick={goBackToGenderZones} className="hover:bg-blue-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedGenderZone === null ? "Gender Distribution per Zone" : `Gender in Zone ${selectedGenderZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closeGenderModal} className="hover:bg-blue-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {selectedGenderZone === null ? (
                                            <motion.div key="gender-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zoneGenderData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-gradient-to-br from-blue-600 to-teal-600 text-white p-8 rounded-2xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:from-blue-700 hover:to-teal-700"
                                                        onClick={() => setSelectedGenderZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <div className="mt-4 space-y-2">
                                                            <p className="text-4xl font-bold">{data.male}</p>
                                                            <p className="text-sm opacity-90">Male</p>
                                                            <p className="text-4xl font-bold">{data.female}</p>
                                                            <p className="text-sm opacity-90">Female</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="gender-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <PaginatedNameList names={zoneMaleNames[selectedGenderZone] || []} title="Male Residents" />
                                                    <PaginatedNameList names={zoneFemaleNames[selectedGenderZone] || []} title="Female Residents" />
                                                </div>
                                                <p className="text-base text-gray-500 text-center mt-8">
                                                    Total in Zone {selectedGenderZone}: {zoneGenderData[selectedGenderZone].male + zoneGenderData[selectedGenderZone].female}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Demographics;