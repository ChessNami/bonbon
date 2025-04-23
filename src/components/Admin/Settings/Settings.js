import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabaseClient";
import Loader from "../../Loader";
import { FaTrash, FaFileExport, FaFileExcel } from "react-icons/fa";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getAllRegions, getProvincesByRegion, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';

const Settings = () => {
    const [footerData, setFooterData] = useState({
        left_info: { address: "", telephone: "", email: "" },
        center_info: [{ imgUrl: "", name: "", link: "" }],
        right_info: [],
        logosize: 16,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [emailError, setEmailError] = useState("");
    const [residents, setResidents] = useState([]);
    const [addressMappings, setAddressMappings] = useState({
        region: {},
        province: {},
        city: {},
        barangay: {},
    });

    const socialMediaOptions = [
        { name: "Facebook", imgUrl: "https://cdn-icons-png.flaticon.com/512/733/733547.png" },
        { name: "X", imgUrl: "https://cdn-icons-png.flaticon.com/512/5969/5969020.png" },
        { name: "Instagram", imgUrl: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png" },
    ];

    // Fetch address mappings
    useEffect(() => {
        const fetchAddressMappings = () => {
            try {
                const regions = getAllRegions();
                const regionMap = regions.reduce((map, region) => {
                    map[region.psgcCode] = region.name;
                    return map;
                }, {});

                const provinces = regions.flatMap((region) => getProvincesByRegion(region.psgcCode));
                const provinceMap = provinces.reduce((map, province) => {
                    map[province.psgcCode] = province.name;
                    return map;
                }, {});

                const cities = provinces.flatMap((province) => getMunicipalitiesByProvince(province.psgcCode));
                const cityMap = cities.reduce((map, city) => {
                    map[city.psgcCode] = city.name;
                    return map;
                }, {});

                const barangays = cities.flatMap((city) => getBarangaysByMunicipality(city.psgcCode));
                const barangayMap = barangays.reduce((map, barangay) => {
                    map[barangay.psgcCode] = barangay.name;
                    return map;
                }, {});

                setAddressMappings({
                    region: regionMap,
                    province: provinceMap,
                    city: cityMap,
                    barangay: barangayMap,
                });
            } catch (error) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Failed to load address mappings',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });
            }
        };

        fetchAddressMappings();
    }, []);

    // Fetch residents
    const fetchResidents = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('residents')
                .select(`
                    id,
                    user_id,
                    household,
                    spouse,
                    household_composition,
                    census,
                    children_count,
                    number_of_household_members,
                    resident_profile_status (
                        id,
                        status,
                        rejection_reason,
                        updated_at
                    )
                `);

            if (error) {
                throw new Error('Failed to fetch residents');
            }

            const formattedResidents = data.map((resident) => {
                let household;
                try {
                    household = typeof resident.household === 'string'
                        ? JSON.parse(resident.household)
                        : resident.household;
                } catch (parseError) {
                    console.error(`Error parsing household for resident ${resident.id}:`, parseError);
                    household = {
                        firstName: 'Unknown',
                        lastName: 'Unknown',
                        gender: 'Unknown',
                        dob: 'Unknown',
                        address: 'Unknown',
                        zone: 'Unknown',
                    };
                }

                let spouse = null;
                try {
                    if (resident.spouse) {
                        spouse = typeof resident.spouse === 'string'
                            ? JSON.parse(resident.spouse)
                            : resident.spouse;
                    }
                } catch (parseError) {
                    console.error(`Error parsing spouse for resident ${resident.id}:`, parseError);
                    spouse = null;
                }

                let householdComposition = [];
                try {
                    if (resident.household_composition) {
                        householdComposition = typeof resident.household_composition === 'string'
                            ? JSON.parse(resident.household_composition)
                            : resident.household_composition;
                        if (!Array.isArray(householdComposition)) {
                            householdComposition = [];
                        }
                    }
                } catch (parseError) {
                    console.error(`Error parsing household_composition for resident ${resident.id}:`, parseError);
                    householdComposition = [];
                }

                let census = {};
                try {
                    if (resident.census) {
                        census = typeof resident.census === 'string'
                            ? JSON.parse(resident.census)
                            : resident.census;
                    }
                } catch (parseError) {
                    console.error(`Error parsing census for resident ${resident.id}:`, parseError);
                    census = {};
                }

                return {
                    id: resident.id,
                    userId: resident.user_id,
                    firstName: household.firstName || 'Unknown',
                    lastName: household.lastName || 'Unknown',
                    gender: household.gender || 'Unknown',
                    dob: household.dob || 'Unknown',
                    address: household.address || 'Unknown',
                    purok: household.zone || 'Unknown',
                    householdHead: `${household.firstName || 'Unknown'} ${household.lastName || 'Unknown'}`,
                    status: resident.resident_profile_status?.status || 3,
                    rejectionReason: resident.resident_profile_status?.rejection_reason,
                    rejectionDate: resident.resident_profile_status?.updated_at,
                    householdData: household,
                    spouseData: spouse,
                    householdComposition: householdComposition,
                    censusData: census,
                    childrenCount: resident.children_count || 0,
                    numberOfHouseholdMembers: resident.number_of_household_members || 0,
                };
            });

            setResidents(formattedResidents);
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: error.message || 'Unexpected error fetching residents',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
        }
    }, []);

    const fetchFooterData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("footer_config")
                .select("*")
                .single();

            if (error) {
                console.error("Error fetching footer data:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to fetch footer data: " + error.message,
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            } else {
                setFooterData(data || {
                    left_info: { address: "", telephone: "", email: "" },
                    center_info: [{ imgUrl: "", name: "", link: "" }],
                    right_info: [],
                    logosize: 16,
                });
            }
            await fetchResidents();
        } catch (error) {
            console.error("Unexpected error:", error);
            Swal.fire({
                icon: "error",
                title: "Unexpected Error",
                text: "An unexpected error occurred while fetching data.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, [fetchResidents]);

    useEffect(() => {
        fetchFooterData();
    }, [fetchFooterData]);

    const handleInputChange = (section, field, value) => {
        if (section === "left_info" && field === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            setFooterData((prev) => ({
                ...prev,
                [section]: { ...prev[section], [field]: value },
            }));
            if (!value) {
                setEmailError("Email is required");
            } else if (!emailRegex.test(value)) {
                setEmailError("Please enter a valid email address");
            } else {
                setEmailError("");
            }
        } else {
            setFooterData((prev) => ({
                ...prev,
                [section]: { ...prev[section], [field]: value },
            }));
        }
    };

    const handleLogoSizeChange = (value) => {
        setFooterData((prev) => ({
            ...prev,
            logosize: parseInt(value, 10) || 16,
        }));
    };

    const addSocialLink = () => {
        setFooterData((prev) => ({
            ...prev,
            center_info: [...prev.center_info, { imgUrl: "", name: "", link: "" }],
        }));
    };

    const updateSocialInfo = (index, field, value) => {
        const updatedCenterInfo = [...footerData.center_info];
        if (field === "imgUrl") {
            const selectedOption = socialMediaOptions.find(option => option.imgUrl === value);
            updatedCenterInfo[index].imgUrl = value;
            updatedCenterInfo[index].name = selectedOption ? selectedOption.name : updatedCenterInfo[index].name;
        } else {
            updatedCenterInfo[index][field] = value;
        }
        setFooterData({ ...footerData, center_info: updatedCenterInfo });
    };

    const removeSocialLink = (index) => {
        setFooterData((prev) => ({
            ...prev,
            center_info: prev.center_info.filter((_, i) => i !== index),
        }));
    };

    const saveSettings = async () => {
        if (emailError) {
            Swal.fire({
                icon: "error",
                title: "Validation Error",
                text: "Please correct the email address before saving.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
            return;
        }

        Swal.fire({
            title: "Saving...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const { error } = await supabase
                .from("footer_config")
                .upsert(
                    {
                        id: 1,
                        left_info: footerData.left_info,
                        center_info: footerData.center_info,
                        right_info: footerData.right_info,
                        logosize: footerData.logosize,
                    },
                    { onConflict: "id" }
                );

            Swal.close();

            if (error) {
                console.error("Error saving settings:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to save settings: " + error.message,
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            } else {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "Settings saved successfully!",
                    position: "top-right",
                    toast: true,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer);
                        toast.addEventListener('mouseleave', Swal.resumeTimer);
                    },
                    scrollbarPadding: false,
                });
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            Swal.close();
            Swal.fire({
                icon: "error",
                title: "Unexpected Error",
                text: "An unexpected error occurred while saving settings.",
                position: "top-right",
                toast: true,
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
                scrollbarPadding: false,
            });
        }
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const householdHeadWorksheet = workbook.addWorksheet('Household Heads');
        const spouseWorksheet = workbook.addWorksheet('Spouses');
        const childrenWorksheet = workbook.addWorksheet('Children');
        const householdMembersWorksheet = workbook.addWorksheet('Other Household Members');

        // Household Heads Worksheet Columns
        const householdHeadColumns = [
            { header: 'Resident ID', key: 'id', width: 15 },
            { header: 'First Name', key: 'firstName', width: 25 },
            { header: 'Middle Name', key: 'middleName', width: 25 },
            { header: 'Last Name', key: 'lastName', width: 25 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Region', key: 'region', width: 25 },
            { header: 'Province', key: 'province', width: 25 },
            { header: 'City', key: 'city', width: 25 },
            { header: 'Barangay', key: 'barangay', width: 25 },
            { header: 'Zone/Purok', key: 'zone', width: 20 },
            { header: 'Zip Code', key: 'zipCode', width: 15 },
            { header: 'Date of Birth', key: 'dob', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Gender', key: 'gender', width: 15 },
            { header: 'Civil Status', key: 'civilStatus', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 20 },
            { header: 'ID Type', key: 'idType', width: 20 },
            { header: 'ID Number', key: 'idNo', width: 20 },
            { header: 'Employment Type', key: 'employmentType', width: 20 },
            { header: 'Education', key: 'education', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Children Count', key: 'childrenCount', width: 15 },
            { header: 'Household Members', key: 'numberOfHouseholdMembers', width: 20 }
        ];

        householdHeadWorksheet.columns = householdHeadColumns;

        // Spouses Worksheet Columns
        const spouseColumns = [
            { header: 'Resident ID', key: 'residentId', width: 15 },
            { header: 'First Name', key: 'firstName', width: 25 },
            { header: 'Middle Name', key: 'middleName', width: 25 },
            { header: 'Last Name', key: 'lastName', width: 25 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Region', key: 'region', width: 25 },
            { header: 'Province', key: 'province', width: 25 },
            { header: 'City', key: 'city', width: 25 },
            { header: 'Barangay', key: 'barangay', width: 25 },
            { header: 'Date of Birth', key: 'dob', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Gender', key: 'gender', width: 15 },
            { header: 'Civil Status', key: 'civilStatus', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 20 },
            { header: 'ID Type', key: 'idType', width: 20 },
            { header: 'ID Number', key: 'idNo', width: 20 },
            { header: 'Education', key: 'education', width: 20 },
            { header: 'Employment Type', key: 'employmentType', width: 20 }
        ];

        spouseWorksheet.columns = spouseColumns;

        // Children Worksheet Columns
        const childrenColumns = [
            { header: 'Resident ID', key: 'residentId', width: 15 },
            { header: 'First Name', key: 'firstName', width: 25 },
            { header: 'Middle Name', key: 'middleName', width: 25 },
            { header: 'Middle Initial', key: 'middleInitial', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 25 },
            { header: 'Relation', key: 'relation', width: 15 },
            { header: 'Gender', key: 'gender', width: 15 },
            { header: 'Custom Gender', key: 'customGender', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Date of Birth', key: 'dob', width: 20 },
            { header: 'Education', key: 'education', width: 20 },
            { header: 'Occupation', key: 'occupation', width: 20 },
            { header: 'Living with Parents', key: 'isLivingWithParents', width: 20 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Region', key: 'region', width: 25 },
            { header: 'Province', key: 'province', width: 25 },
            { header: 'City', key: 'city', width: 25 },
            { header: 'Barangay', key: 'barangay', width: 25 },
            { header: 'Zone/Purok', key: 'zone', width: 20 },
            { header: 'Zip Code', key: 'zipCode', width: 15 }
        ];

        childrenWorksheet.columns = childrenColumns;

        // Other Household Members Worksheet Columns
        const householdMembersColumns = [
            { header: 'Resident ID', key: 'residentId', width: 15 },
            { header: 'First Name', key: 'firstName', width: 25 },
            { header: 'Middle Name', key: 'middleName', width: 25 },
            { header: 'Middle Initial', key: 'middleInitial', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 25 },
            { header: 'Relation', key: 'relation', width: 15 },
            { header: 'Gender', key: 'gender', width: 15 },
            { header: 'Custom Gender', key: 'customGender', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Date of Birth', key: 'dob', width: 20 },
            { header: 'Education', key: 'education', width: 20 },
            { header: 'Occupation', key: 'occupation', width: 20 }
        ];

        householdMembersWorksheet.columns = householdMembersColumns;

        if (residents.length === 0) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "warning",
                title: "No residents available to export!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        residents.forEach(resident => {
            const statusMap = {
                1: 'Approved',
                2: 'Rejected',
                3: 'Pending',
                4: 'Update Requested',
                5: 'Update Approved'
            };
            const householdData = resident.householdData || {};
            const rowData = {
                id: resident.id || 'N/A',
                firstName: householdData.firstName || 'N/A',
                middleName: householdData.middleName || 'N/A',
                lastName: householdData.lastName || 'N/A',
                address: householdData.address || 'N/A',
                region: addressMappings.region[householdData.region] || 'N/A',
                province: addressMappings.province[householdData.province] || 'N/A',
                city: addressMappings.city[householdData.city] || 'N/A',
                barangay: addressMappings.barangay[householdData.barangay] || 'N/A',
                zone: householdData.zone || 'N/A',
                zipCode: householdData.zipCode || 'N/A',
                dob: householdData.dob || 'N/A',
                age: householdData.age || 'N/A',
                gender: householdData.gender || 'N/A',
                civilStatus: householdData.civilStatus || 'N/A',
                phoneNumber: householdData.phoneNumber || 'N/A',
                idType: householdData.idType || 'N/A',
                idNo: householdData.idNo || 'N/A',
                employmentType: householdData.employmentType || 'N/A',
                education: householdData.education || 'N/A',
                status: statusMap[resident.status] || 'Unknown',
                childrenCount: resident.childrenCount || 0,
                numberOfHouseholdMembers: resident.numberOfHouseholdMembers || 0
            };
            householdHeadWorksheet.addRow(rowData);

            if (resident.spouseData) {
                const spouseData = resident.spouseData;
                const spouseRowData = {
                    residentId: resident.id || 'N/A',
                    firstName: spouseData.firstName || 'N/A',
                    middleName: spouseData.middleName || 'N/A',
                    lastName: spouseData.lastName || 'N/A',
                    address: spouseData.address || 'N/A',
                    region: addressMappings.region[spouseData.region] || 'N/A',
                    province: addressMappings.province[spouseData.province] || 'N/A',
                    city: addressMappings.city[spouseData.city] || 'N/A',
                    barangay: addressMappings.barangay[spouseData.barangay] || 'N/A',
                    dob: spouseData.dob || 'N/A',
                    age: spouseData.age || 'N/A',
                    gender: spouseData.gender || 'N/A',
                    civilStatus: spouseData.civilStatus || 'N/A',
                    phoneNumber: spouseData.phoneNumber || 'N/A',
                    idType: spouseData.idType || 'N/A',
                    idNo: spouseData.idNo || 'N/A',
                    education: spouseData.education || 'N/A',
                    employmentType: spouseData.employmentType || 'N/A'
                };
                spouseWorksheet.addRow(spouseRowData);
            }

            if (resident.householdComposition && Array.isArray(resident.householdComposition)) {
                resident.householdComposition
                    .filter(member => member.relation === 'Son' || member.relation === 'Daughter')
                    .forEach(member => {
                        const childRowData = {
                            residentId: resident.id || 'N/A',
                            firstName: member.firstName || 'N/A',
                            middleName: member.middleName || 'N/A',
                            middleInitial: member.middleInitial || 'N/A',
                            lastName: member.lastName || 'N/A',
                            relation: member.relation || 'N/A',
                            gender: member.gender || 'N/A',
                            customGender: member.customGender || 'N/A',
                            age: member.age || 'N/A',
                            dob: member.dob || 'N/A',
                            education: member.education || 'N/A',
                            occupation: member.occupation || 'N/A',
                            isLivingWithParents: member.isLivingWithParents || 'N/A',
                            address: member.address || 'N/A',
                            region: addressMappings.region[member.region] || 'N/A',
                            province: addressMappings.province[member.province] || 'N/A',
                            city: addressMappings.city[member.city] || 'N/A',
                            barangay: addressMappings.barangay[member.barangay] || 'N/A',
                            zone: member.zone || 'N/A',
                            zipCode: member.zipCode || 'N/A'
                        };
                        childrenWorksheet.addRow(childRowData);
                    });

                resident.householdComposition
                    .filter(member => member.relation !== 'Son' && member.relation !== 'Daughter')
                    .forEach(member => {
                        const memberRowData = {
                            residentId: resident.id || 'N/A',
                            firstName: member.firstName || 'N/A',
                            middleName: member.middleName || 'N/A',
                            middleInitial: member.middleInitial || 'N/A',
                            lastName: member.lastName || 'N/A',
                            relation: member.relation || 'N/A',
                            gender: member.gender || 'N/A',
                            customGender: member.customGender || 'N/A',
                            age: member.age || 'N/A',
                            dob: member.dob || 'N/A',
                            education: member.education || 'N/A',
                            occupation: member.occupation || 'N/A'
                        };
                        householdMembersWorksheet.addRow(memberRowData);
                    });
            }
        });

        // Style Household Heads Worksheet
        householdHeadWorksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2B6CB0' }
            };
            cell.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: 'FFFFFF' }
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: { style: 'medium', color: { argb: '1A4971' } },
                bottom: { style: 'medium', color: { argb: '1A4971' } },
                left: { style: 'medium', color: { argb: '1A4971' } },
                right: { style: 'medium', color: { argb: '1A4971' } }
            };
        });

        householdHeadWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowColor = rowNumber % 2 === 0 ? 'EDF2F7' : 'FFFFFF';

            row.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '1A202C' },
                    bold: colNumber === 2 || colNumber === 4
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowColor }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A0AEC0' } },
                    bottom: { style: 'thin', color: { argb: 'A0AEC0' } },
                    left: { style: 'thin', color: { argb: 'A0AEC0' } },
                    right: { style: 'thin', color: { argb: 'A0AEC0' } }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 5 ? 'left' : 'center',
                    wrapText: true
                };

                if (colNumber === 21) {
                    const statusColors = {
                        'Approved': 'C6F6D5',
                        'Rejected': 'FED7D7',
                        'Pending': 'FEFCBF',
                        'Update Requested': 'BEE3F8',
                        'Update Approved': 'D6BCFA'
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: statusColors[cell.value] || 'FFFFFF' }
                    };
                    cell.font = {
                        ...cell.font,
                        color: { argb: cell.value === 'Rejected' ? '9B2C2C' : '2D3748' },
                        italic: cell.value === 'Rejected'
                    };
                }
            });
            row.height = 28;
        });

        householdHeadWorksheet.getRow(1).height = 35;

        // Style Spouses Worksheet
        spouseWorksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2B6CB0' }
            };
            cell.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: 'FFFFFF' }
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: { style: 'medium', color: { argb: '1A4971' } },
                bottom: { style: 'medium', color: { argb: '1A4971' } },
                left: { style: 'medium', color: { argb: '1A4971' } },
                right: { style: 'medium', color: { argb: '1A4971' } }
            };
        });

        spouseWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowColor = rowNumber % 2 === 0 ? 'EDF2F7' : 'FFFFFF';

            row.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '1A202C' },
                    bold: colNumber === 2 || colNumber === 4
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowColor }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A0AEC0' } },
                    bottom: { style: 'thin', color: { argb: 'A0AEC0' } },
                    left: { style: 'thin', color: { argb: 'A0AEC0' } },
                    right: { style: 'thin', color: { argb: 'A0AEC0' } }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 5 ? 'left' : 'center',
                    wrapText: true
                };
            });
            row.height = 28;
        });

        spouseWorksheet.getRow(1).height = 35;

        // Style Children Worksheet
        childrenWorksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2B6CB0' }
            };
            cell.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: 'FFFFFF' }
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: { style: 'medium', color: { argb: '1A4971' } },
                bottom: { style: 'medium', color: { argb: '1A4971' } },
                left: { style: 'medium', color: { argb: '1A4971' } },
                right: { style: 'medium', color: { argb: '1A4971' } }
            };
        });

        childrenWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowColor = rowNumber % 2 === 0 ? 'EDF2F7' : 'FFFFFF';

            row.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '1A202C' },
                    bold: colNumber === 2 || colNumber === 5
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowColor }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A0AEC0' } },
                    bottom: { style: 'thin', color: { argb: 'A0AEC0' } },
                    left: { style: 'thin', color: { argb: 'A0AEC0' } },
                    right: { style: 'thin', color: { argb: 'A0AEC0' } }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 14 ? 'left' : 'center',
                    wrapText: true
                };
            });
            row.height = 28;
        });

        childrenWorksheet.getRow(1).height = 35;

        // Style Other Household Members Worksheet
        householdMembersWorksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2B6CB0' }
            };
            cell.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: 'FFFFFF' }
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: { style: 'medium', color: { argb: '1A4971' } },
                bottom: { style: 'medium', color: { argb: '1A4971' } },
                left: { style: 'medium', color: { argb: '1A4971' } },
                right: { style: 'medium', color: { argb: '1A4971' } }
            };
        });

        householdMembersWorksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowColor = rowNumber % 2 === 0 ? 'EDF2F7' : 'FFFFFF';

            row.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '1A202C' },
                    bold: colNumber === 2 || colNumber === 5
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowColor }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A0AEC0' } },
                    bottom: { style: 'thin', color: { argb: 'A0AEC0' } },
                    left: { style: 'thin', color: { argb: 'A0AEC0' } },
                    right: { style: 'thin', color: { argb: 'A0AEC0' } }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center',
                    wrapText: true
                };
            });
            row.height = 28;
        });

        householdMembersWorksheet.getRow(1).height = 35;

        try {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Residents_${new Date().toISOString().slice(0, 10)}.xlsx`);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Export successful!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to export residents!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    // Export Projects to Excel
    const formatNumberWithCommas = (number) => {
        if (number == null || isNaN(number)) return '0';
        return Number(number).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const exportProjectsToExcel = async () => {
        const { data: projects, error } = await supabase.from("projects").select("*");
        if (error) {
            console.error("Error fetching projects:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to fetch projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Projects');

        // Define columns
        const columns = [
            { header: 'Project Title', key: 'title', width: 30 },
            { header: 'Location', key: 'location', width: 40 },
            { header: 'Contractor', key: 'contractor', width: 25 },
            { header: 'Contract Payment', key: 'contract_payment', width: 20 },
            { header: 'Update Status', key: 'update_status', width: 15 },
            { header: 'Completion Rate', key: 'completion_rate', width: 15 },
            { header: 'Monitoring Start', key: 'date_monitoring_start', width: 20 },
            { header: 'Monitoring End', key: 'date_monitoring_end', width: 20 },
            { header: 'Issues', key: 'issues', width: 35 },
            { header: 'Project Engineer', key: 'project_engineer', width: 25 },
            { header: 'Project Color', key: 'color', width: 20 }
        ];

        worksheet.columns = columns;

        // Add data
        if (projects.length === 0) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "warning",
                title: "No projects available to export!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        projects.forEach(polygon => {
            const rowData = {
                title: polygon.title || 'N/A',
                location: polygon.location || 'N/A',
                contractor: polygon.contractor || 'N/A',
                contract_payment: `₱${formatNumberWithCommas(polygon.contract_payment || '0')}`,
                update_status: polygon.update_status || 'N/A',
                completion_rate: `${polygon.completion_rate || 0}%`,
                date_monitoring_start: polygon.date_monitoring_start || 'N/A',
                date_monitoring_end: polygon.date_monitoring_end || 'N/A',
                issues: polygon.issues || 'None',
                project_engineer: polygon.project_engineer || 'N/A',
                color: polygon.color || 'N/A'
            };
            worksheet.addRow(rowData);
        });

        // Style header row
        worksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2B6CB0' }
            };
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFF' },
                name: 'Calibri',
                size: 12
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'medium', color: { argb: '1A4971' } },
                bottom: { style: 'medium', color: { argb: '1A4971' } },
                left: { style: 'medium', color: { argb: '1A4971' } },
                right: { style: 'medium', color: { argb: '1A4971' } }
            };
        });

        // Style data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowColor = rowNumber % 2 === 0 ? 'EDF2F7' : 'FFFFFF';

            row.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    color: { argb: '1A202C' }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowColor }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A0AEC0' } },
                    bottom: { style: 'thin', color: { argb: 'A0AEC0' } },
                    left: { style: 'thin', color: { argb: 'A0AEC0' } },
                    right: { style: 'thin', color: { argb: 'A0AEC0' } }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber === 1 ? 'left' : 'center',
                    wrapText: true
                };

                // Update Status styling
                if (colNumber === 5) {
                    const statusColors = {
                        'Planned': 'BEE3F8',
                        'In Progress': 'FEFCBF',
                        'Completed': 'C6F6D5',
                        'Terminated': 'FED7D7',
                        'Cancelled': 'E2E8F0'
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: statusColors[cell.value] || 'FFFFFF' }
                    };
                }

                // Completion Rate styling
                if (colNumber === 6) {
                    const value = parseInt(cell.value) || 0;
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: value === 100 ? '9AE6B4' : value >= 50 ? 'FEEBC8' : 'FEB2B2'
                        }
                    };
                    cell.font.color = { argb: value < 50 ? '9B2C2C' : '2D3748' };
                }

                // Project Color styling
                if (colNumber === 11) {
                    const colorStyles = {
                        'Satisfactory': 'BEE3F8',
                        'With Minor Deficiencies': 'FEEBC8',
                        'With Serious Deficiencies': 'FED7D7'
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colorStyles[cell.value] || 'FFFFFF' }
                    };
                }
            });
            row.height = 28;
        });

        // Set header row height
        worksheet.getRow(1).height = 35;

        // Generate and save file
        try {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Projects_${new Date().toISOString().slice(0, 10)}.xlsx`);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Export successful!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to export projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen"
        >
            {/* Navigation Menu */}
            <nav className="mb-8 bg-white shadow-lg rounded-xl p-4">
                <ul className="flex flex-col sm:flex-row gap-4 items-center">
                    <li>
                        <motion.a
                            href="#footer-settings"
                            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md"
                            whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                        >
                            Footer Configuration
                        </motion.a>
                    </li>
                    <li>
                        <motion.a
                            href="#export-data"
                            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md"
                            whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                        >
                            Export Data
                        </motion.a>
                    </li>
                </ul>
            </nav>

            {/* Footer Settings Section */}
            <section id="footer-settings" className="bg-white rounded-xl shadow-2xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-4">Footer Configuration</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Section Inputs */}
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Contact Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your address"
                                        value={footerData.left_info.address}
                                        onChange={(e) => handleInputChange("left_info", "address", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Telephone</label>
                                    <input
                                        type="text"
                                        placeholder="Enter telephone number"
                                        value={footerData.left_info.telephone}
                                        onChange={(e) => handleInputChange("left_info", "telephone", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={footerData.left_info.email}
                                        onChange={(e) => handleInputChange("left_info", "email", e.target.value)}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailError ? "border-red-500" : "border-gray-300"}`}
                                    />
                                    {emailError && (
                                        <p className="text-red-500 text-sm mt-1">{emailError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center Section Inputs */}
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Social Media Links</h3>
                            {footerData.center_info.map((social, index) => (
                                <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex items-center gap-2 w-full sm:w-[180px]">
                                        {social.imgUrl && (
                                            <img
                                                src={social.imgUrl}
                                                alt={social.name || "Social Icon"}
                                                className="w-5 h-5 flex-shrink-0"
                                            />
                                        )}
                                        <select
                                            value={social.imgUrl}
                                            onChange={(e) => updateSocialInfo(index, "imgUrl", e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                        >
                                            <option value="">Select Platform</option>
                                            {socialMediaOptions.map((option) => (
                                                <option key={option.imgUrl} value={option.imgUrl}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={social.name}
                                        onChange={(e) => updateSocialInfo(index, "name", e.target.value)}
                                        className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Link"
                                        value={social.link}
                                        onChange={(e) => updateSocialInfo(index, "link", e.target.value)}
                                        className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px]"
                                    />
                                    <button
                                        onClick={() => removeSocialLink(index)}
                                        className="text-red-500 p-2 hover:text-red-700 transition-colors"
                                        title="Remove"
                                    >
                                        <FaTrash size={20} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addSocialLink}
                                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                            >
                                + Add New Social Link
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Section Inputs */}
                <div className="mt-8">
                    <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold mb-4 text-gray-700">Logo Settings</h3>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-600">Logo Size</label>
                            <input
                                type="number"
                                placeholder="Logo Size (px)"
                                value={footerData.logosize}
                                onChange={(e) => handleLogoSizeChange(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="1"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[0, 1].map((pos) => {
                                    const inputId = `logo-upload-${pos}`;
                                    return (
                                        <div key={pos} className="space-y-4">
                                            <label
                                                htmlFor={inputId}
                                                className="block text-sm font-medium text-gray-600"
                                            >
                                                Upload Logo {pos + 1}
                                            </label>
                                            <input
                                                id={inputId}
                                                type="file"
                                                accept="image/png"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const newRightInfo = [...footerData.right_info];
                                                            newRightInfo[pos] = { imgUrl: reader.result };
                                                            setFooterData({ ...footerData, right_info: newRightInfo });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full"
                                            />
                                            {footerData.right_info[pos]?.imgUrl ? (
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={footerData.right_info[pos].imgUrl}
                                                        alt={`Logo ${pos + 1}`}
                                                        className={`h-${footerData.logosize} w-${footerData.logosize} object-contain`}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newRightInfo = [...footerData.right_info];
                                                            newRightInfo[pos] = null;
                                                            setFooterData({ ...footerData, right_info: newRightInfo });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <FaTrash size={20} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-gray-400">No logo uploaded</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8">
                    <motion.button
                        onClick={saveSettings}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-md"
                        whileHover={{ scale: 1.05, backgroundColor: "#2563eb", transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                    >
                        Save All Settings
                    </motion.button>
                </div>
            </section>

            {/* Footer Preview */}
            <div className="my-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Footer Preview</h3>
                <footer className="bg-gray-800 text-white p-4 rounded">
                    <div className="container mx-auto">
                        <div className="flex flex-col space-y-6 sm:flex-row sm:space-y-0 sm:space-x-4">
                            {/* Left Section Preview */}
                            <div className="w-full sm:w-1/3">
                                <h3 className="font-semibold text-xl mb-2">Contact Information</h3>
                                <address className="text-md space-y-2">
                                    {footerData.left_info.address ? (
                                        <p>{footerData.left_info.address}</p>
                                    ) : (
                                        <p className="text-gray-400">No address provided</p>
                                    )}
                                    {footerData.left_info.telephone ? (
                                        <p>Telephone: {footerData.left_info.telephone}</p>
                                    ) : (
                                        <p className="text-gray-400">No telephone provided</p>
                                    )}
                                    {footerData.left_info.email ? (
                                        <p>Email Address: {footerData.left_info.email}</p>
                                    ) : (
                                        <p className="text-gray-400">No email provided</p>
                                    )}
                                </address>
                            </div>

                            {/* Center Section Preview */}
                            <div className="w-full sm:w-1/3 flex justify-center">
                                <div className="flex flex-wrap gap-4">
                                    {footerData.center_info.length > 0 ? (
                                        footerData.center_info.map((social, index) => (
                                            <a
                                                key={index}
                                                href={social.link || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-2"
                                            >
                                                {social.imgUrl ? (
                                                    <img src={social.imgUrl} alt={social.name} className="w-8 h-8" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-gray-300"></div>
                                                )}
                                                <span className="text-md">{social.name || "Social Name"}</span>
                                            </a>
                                        ))
                                    ) : (
                                        <p className="text-gray-400">No social media links provided</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Section Preview */}
                            <div className="w-full sm:w-1/3 flex justify-end">
                                <div className="flex flex-wrap gap-4 items-center">
                                    {footerData.right_info.some(logo => logo?.imgUrl) ? (
                                        footerData.right_info.map((logo, index) =>
                                            logo?.imgUrl ? (
                                                <img
                                                    key={index}
                                                    src={logo.imgUrl}
                                                    alt={`Logo ${index + 1}`}
                                                    className={`h-${footerData.logosize} w-${footerData.logosize} object-contain`}
                                                />
                                            ) : null
                                        )
                                    ) : (
                                        <p className="text-gray-400">No logos provided</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Export Data Section */}
            <section id="export-data" className="bg-white rounded-xl shadow-2xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-4">Export Data</h2>
                <div className="p-4 bg-gray-50 rounded-xl shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Export Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.button
                            onClick={exportToExcel}
                            className="flex items-center justify-center px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold shadow-md"
                            whileHover={{ scale: 1.01, backgroundColor: "#2c7a7b", transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            aria-label="Export residents to Excel"
                        >
                            <FaFileExport className="mr-2" />
                            <span>Export Residents</span>
                        </motion.button>
                        <motion.button
                            onClick={exportProjectsToExcel}
                            className="flex items-center justify-center px-6 py-3 rounded-lg bg-green-600 text-white font-semibold shadow-md"
                            whileHover={{ scale: 1.01, backgroundColor: "#2f855a", transition: { duration: 0.15 } }}
                            whileTap={{ scale: 0.95, transition: { duration: 0.15 } }}
                            aria-label="Export projects to Excel"
                        >
                            <FaFileExcel className="mr-2" />
                            <span>Export Projects</span>
                        </motion.button>
                    </div>
                </div>
            </section>

        </motion.div>
    );
};

export default Settings;