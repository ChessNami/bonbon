import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";
import { FaSearch, FaUser, FaChevronLeft, FaChevronRight, FaSpinner, FaFilter } from "react-icons/fa";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../utils/supabaseUtils";
import Swal from "sweetalert2";

const RoleManagement = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState("display_name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedUserForRole, setSelectedUserForRole] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchRoles();
        fetchUsers();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchRoles = async () => {
        const { data, error } = await supabase.from("roles").select("*");
        if (error) {
            Swal.fire("Error", "Failed to fetch roles", "error");
        } else {
            setRoles(data);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: userRoles, error: rolesError } = await supabase
                .from("user_roles")
                .select("user_id, role_id");

            if (rolesError) throw new Error("Failed to fetch user roles");

            const userIds = [...new Set(userRoles.map((ur) => ur.user_id))];
            const { data: userData, error: userError } = await supabase.rpc(
                "get_users_by_ids",
                { user_ids: userIds }
            );

            if (userError) throw new Error("Failed to fetch user data");

            const userMap = new Map();
            userData.forEach((user) => {
                userMap.set(user.id, {
                    display_name: user.raw_user_meta_data?.display_name || "Anonymous",
                });
            });

            const formattedUsers = await Promise.all(
                userRoles.map(async (role) => {
                    const photos = await fetchUserPhotos(role.user_id);
                    const userInfo = userMap.get(role.user_id) || {
                        display_name: "Anonymous",
                    };
                    return {
                        user_id: role.user_id,
                        role_id: role.role_id,
                        display_name: userInfo.display_name,
                        profilePic: photos.profilePic,
                    };
                })
            );

            setUsers(formattedUsers);
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
        setLoading(false);
    };

    useEffect(() => {
        const subscriptions = [];
        users.forEach((user) => {
            const unsubscribe = subscribeToUserPhotos(user.user_id, (newPhotos) => {
                setUsers((prevUsers) =>
                    prevUsers.map((u) =>
                        u.user_id === user.user_id ? { ...u, profilePic: newPhotos.profilePic } : u
                    )
                );
            });
            subscriptions.push(unsubscribe);
        });
        return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    }, [users]);

    useEffect(() => {
        let result = [...users];

        if (searchTerm) {
            result = result.filter((user) =>
                user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortField === "role_id") {
            result = result.filter((user) => {
                const role = roles.find((r) => r.id === user.role_id);
                return role?.name.toLowerCase() === sortOrder.toLowerCase();
            });
        } else {
            result.sort((a, b) => {
                const fieldA = a[sortField]?.toString().toLowerCase() || "";
                const fieldB = b[sortField]?.toString().toLowerCase() || "";
                return sortOrder === "asc" ? (fieldA > fieldB ? 1 : -1) : (fieldA < fieldB ? 1 : -1);
            });
        }

        setFilteredUsers(result);
    }, [searchTerm, sortField, sortOrder, users, roles]);

    const handleRoleChange = async (userId, newRoleId) => {
        const { error } = await supabase
            .from("user_roles")
            .update({ role_id: newRoleId })
            .eq("user_id", userId);

        if (error) {
            Swal.fire("Error", "Failed to update role", "error");
        } else {
            Swal.fire("Success", "Role updated successfully", "success");
            fetchUsers();
            setSelectedUserForRole(null);
        }
    };

    const handleSort = useCallback((field, order) => {
        setSortField(field);
        setSortOrder(order);
    }, []);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <motion.button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1 mx-1 rounded-full text-sm ${currentPage === i
                            ? "bg-[#172554] text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-blue-100"
                        }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {i}
                </motion.button>
            );
        }
        return pageNumbers;
    };

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    };

    return (
        <motion.section
            className="p-4 sm:px-6 lg:px-8 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex-1 flex flex-col w-full mx-auto">
                <motion.div
                    className="mb-6 bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="flex items-center gap-2 flex-1">
                        <FaSearch className="text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#172554]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <motion.button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#172554] text-white rounded-md hover:bg-blue-800"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaFilter />
                            Filter & Sort
                        </motion.button>
                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 z-10"
                                    variants={dropdownVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                >
                                    <h3 className="font-semibold mb-2">Items per page:</h3>
                                    <div className="space-y-2 mb-4">
                                        {[5, 10, 20, 50].map((value) => (
                                            <label key={value} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="itemsPerPage"
                                                    value={value}
                                                    checked={itemsPerPage === value}
                                                    onChange={(e) => {
                                                        setItemsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="form-radio text-[#172554]"
                                                />
                                                {value} per page
                                            </label>
                                        ))}
                                    </div>
                                    <h3 className="font-semibold mb-2">Sort By:</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sort"
                                                checked={sortField === "display_name" && sortOrder === "asc"}
                                                onChange={() => handleSort("display_name", "asc")}
                                                className="form-radio text-[#172554]"
                                            />
                                            Name (A-Z)
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sort"
                                                checked={sortField === "display_name" && sortOrder === "desc"}
                                                onChange={() => handleSort("display_name", "desc")}
                                                className="form-radio text-[#172554]"
                                            />
                                            Name (Z-A)
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sort"
                                                checked={sortField === "role_id" && sortOrder === "user"}
                                                onChange={() => handleSort("role_id", "user")}
                                                className="form-radio text-[#172554]"
                                            />
                                            Role: User
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sort"
                                                checked={sortField === "role_id" && sortOrder === "admin"}
                                                onChange={() => handleSort("role_id", "admin")}
                                                className="form-radio text-[#172554]"
                                            />
                                            Role: Admin
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sort"
                                                checked={sortField === "role_id" && sortOrder === "dev"}
                                                onChange={() => handleSort("role_id", "dev")}
                                                className="form-radio text-[#172554]"
                                            />
                                            Role: Dev
                                        </label>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {loading ? (
                        <motion.div
                            className="flex justify-center items-center h-64"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <FaSpinner className="text-[#172554] text-4xl animate-spin" />
                        </motion.div>
                    ) : paginatedUsers.length === 0 ? (
                        <motion.div
                            className="text-center py-12 bg-white rounded-lg shadow-md max-w-md mx-auto px-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <FaUser className="mx-auto text-gray-400 mb-4" size={40} />
                            <p className="text-gray-600 text-lg">No users found.</p>
                            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters.</p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedUsers.map((user, index) => (
                                <motion.div
                                    key={user.user_id}
                                    className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <motion.button
                                        className="absolute top-2 left-2 px-3 py-1 bg-[#172554] text-white rounded-md text-sm"
                                        onClick={() => setSelectedUserForRole(user)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Change Role
                                    </motion.button>
                                    <div className="flex flex-col items-center">
                                        {user.profilePic ? (
                                            <img
                                                src={user.profilePic}
                                                alt="Profile"
                                                className="w-32 h-32 rounded-md object-cover mb-3"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-md bg-blue-200 mb-3 flex items-center justify-center">
                                                <span className="text-blue-800 font-semibold text-2xl">
                                                    {user.display_name && typeof user.display_name === "string"
                                                        ? user.display_name[0]?.toUpperCase()
                                                        : "A"}
                                                </span>
                                            </div>
                                        )}
                                        <h2 className="text-lg font-semibold text-center">{user.display_name}</h2>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {selectedUserForRole && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            <h3 className="text-xl font-semibold mb-4">
                                Change Role for {selectedUserForRole.display_name}
                            </h3>
                            <select
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#172554] mb-4"
                                value={selectedUserForRole.role_id}
                                onChange={(e) => handleRoleChange(selectedUserForRole.user_id, e.target.value)}
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-2">
                                <motion.button
                                    className="px-4 py-2 bg-gray-200 rounded-md"
                                    onClick={() => setSelectedUserForRole(null)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    className="px-4 py-2 bg-[#172554] text-white rounded-md"
                                    onClick={() => handleRoleChange(selectedUserForRole.user_id, selectedUserForRole.role_id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Save
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {totalPages > 0 && (
                <motion.div
                    className="flex justify-center items-center mt-8 gap-2 pb-4 sticky bottom-0 bg-gray-100"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <motion.button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-blue-100"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaChevronLeft />
                    </motion.button>
                    {renderPageNumbers()}
                    <motion.button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-blue-100"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaChevronRight />
                    </motion.button>
                </motion.div>
            )}
        </motion.section>
    );
};

export default RoleManagement;