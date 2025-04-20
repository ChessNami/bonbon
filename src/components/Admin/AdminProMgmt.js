import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Popup, Polygon, useMapEvents, CircleMarker, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import "../../index.css";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaTag, FaMap, FaMoneyBillWave, FaCalendarAlt, FaUser, FaExclamationCircle, FaImage, FaInfoCircle, FaPercent } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import Compressor from "compressorjs";
import { supabase } from "../../supabaseClient";

const AdminProMgmt = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [polygons, setPolygons] = useState([]);
    const [newPolygonCoords, setNewPolygonCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPolygonId, setEditingPolygonId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newContractor, setNewContractor] = useState("");
    const [newContractPayment, setNewContractPayment] = useState("");
    const [newUpdateStatus, setNewUpdateStatus] = useState("Planned");
    const [newDateMonitoringStart, setNewDateMonitoringStart] = useState("");
    const [newDateMonitoringEnd, setNewDateMonitoringEnd] = useState("");
    const [newIssues, setNewIssues] = useState("");
    const [newProjectEngineer, setNewProjectEngineer] = useState("");
    const [newColor, setNewColor] = useState("Satisfactory");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
    const [selectedPolygonId, setSelectedPolygonId] = useState(null);
    const [completionRate, setCompletionRate] = useState(0);
    const [expandedImages, setExpandedImages] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const modalRef = useRef(null);
    const imageModalRef = useRef(null);
    const completionModalRef = useRef(null);

    const [filterTitle, setFilterTitle] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterColor, setFilterColor] = useState("");
    const [filterCompletionMin, setFilterCompletionMin] = useState("");
    const [filterCompletionMax, setFilterCompletionMax] = useState("");
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");



    // Number formatting utility
    const formatNumberWithCommas = (number) => {
        if (!number) return "";
        return Number(number.replace(/[^0-9.-]+/g, "")).toLocaleString("en-PH");
    };

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role_id")
                    .eq("user_id", user.id)
                    .single();
                if (error) {
                    console.error("Error checking user_roles:", error);
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "error",
                        title: "Failed to verify admin status!",
                        showConfirmButton: false,
                        scrollbarPadding: false,
                        timer: 1500,
                    });
                    return;
                }
                if (data) {
                    const { data: roleData, error: roleError } = await supabase
                        .from("roles")
                        .select("name")
                        .eq("id", data.role_id)
                        .eq("name", "admin")
                        .single();
                    if (roleError) {
                        console.error("Error checking roles:", roleError);
                        Swal.fire({
                            toast: true,
                            position: "top-end",
                            icon: "error",
                            title: "Failed to verify admin role!",
                            showConfirmButton: false,
                            scrollbarPadding: false,
                            timer: 1500,
                        });
                        return;
                    }
                    setIsAdmin(!!roleData);
                }
            } else {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "User not authenticated!",
                    showConfirmButton: false,
                    scrollbarPadding: false,
                    timer: 1500,
                });
            }
        };
        checkAdmin();
    }, []);

    // Fetch projects from Supabase and prefetch addresses and signed image URLs
    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from("projects").select("*");
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

            // Prefetch addresses and signed URLs for images
            const updatedProjects = await Promise.all(
                data.map(async (project) => {
                    // Fetch address if missing or invalid
                    let address = project.location;
                    if (!address || address === "Unknown Location") {
                        const [centerLat, centerLng] = getPolygonCenter(project.coords);
                        address = await fetchAddress(centerLat, centerLng);
                    }

                    // Fetch signed URLs for images
                    let signedImageUrls = [];
                    if (project.images && project.images.length > 0) {
                        signedImageUrls = await Promise.all(
                            project.images.map(async (imageUrl) => {
                                const filePath = imageUrl.split("/project-images/")[1];
                                const { data: signedData, error: signedError } = await supabase.storage
                                    .from("project-images")
                                    .createSignedUrl(filePath, 7200); // 2-hour expiration
                                if (signedError) {
                                    console.error("Error creating signed URL:", signedError);
                                    return imageUrl; // Fallback to original URL
                                }
                                return signedData.signedUrl;
                            })
                        );
                    }

                    return { ...project, location: address, images: signedImageUrls };
                })
            );

            setPolygons(updatedProjects);
        };

        fetchProjects();
    }, []);

    const filteredPolygons = useMemo(() => {
        return polygons.filter((polygon) => {
            const matchesTitle = polygon.title.toLowerCase().includes(filterTitle.toLowerCase());
            const matchesStatus = filterStatus ? polygon.update_status === filterStatus : true;
            const matchesColor = filterColor ? polygon.color === filterColor : true;
            const matchesCompletion =
                (filterCompletionMin === "" || (polygon.completion_rate || 0) >= Number(filterCompletionMin)) &&
                (filterCompletionMax === "" || (polygon.completion_rate || 0) <= Number(filterCompletionMax));
            const matchesDate =
                (filterDateStart === "" || polygon.date_monitoring_start >= filterDateStart) &&
                (filterDateEnd === "" || polygon.date_monitoring_end <= filterDateEnd);
            return matchesTitle && matchesStatus && matchesColor && matchesCompletion && matchesDate;
        });
    }, [
        polygons,
        filterTitle,
        filterStatus,
        filterColor,
        filterCompletionMin,
        filterCompletionMax,
        filterDateStart,
        filterDateEnd,
    ]);

    // Close modals on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (imageModalRef.current && imageModalRef.current.contains(event.target)) {
                return;
            }
            if (completionModalRef.current && completionModalRef.current.contains(event.target)) {
                return;
            }
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
                setIsImageModalOpen(false);
                setIsCompletionModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate polygon center for location lookup
    const getPolygonCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    // Fetch address from Nominatim
    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        "User-Agent": "AdminProMgmt/1.0 (contact: example@example.com)",
                    },
                }
            );
            const data = await response.json();
            return data.display_name || "Address not found";
        } catch (error) {
            console.error("Error fetching address:", error);
            return "Failed to fetch address";
        }
    };

    // Validate polygon for self-intersections
    const isPolygonValid = (coords) => {
        if (coords.length < 3) return true;
        const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
        const issues = kinks(polygon);
        return issues.features.length === 0;
    };

    // Tile error handler component
    const TileErrorHandler = () => {
        const map = useMap();

        useEffect(() => {
            map.invalidateSize();
            map.on("tileerror", (e) => {
                console.error("Tile loading error:", e);
                const tileUrl = e.tile.src.split("?")[0];
                e.tile.src = `${tileUrl}?retry=${Date.now()}`;
            });
            return () => {
                map.off("tileerror");
            };
        }, [map]);
        return null;
    };

    // MapClickHandler component
    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndex === null) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev, newCoord];
                        setActionHistory((prevHistory) => [
                            ...prevHistory,
                            { type: "add", coord: newCoord, index: updatedCoords.length - 1 },
                        ]);
                        setRedoHistory([]);
                        return updatedCoords;
                    });
                }
            },
        });

        // Middle mouse dragging
        useEffect(() => {
            let isMiddleMouseDown = false;
            let lastMousePos = null;
            const mapContainer = map.getContainer();

            const handleMouseDown = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isMiddleMouseDown = true;
                    lastMousePos = { x: e.clientX, y: e.clientY };
                    mapContainer.classList.add("map-dragging");
                }
            };

            const handleMouseMove = (e) => {
                if (isMiddleMouseDown) {
                    const currentPos = { x: e.clientX, y: e.clientY };
                    const deltaX = lastMousePos.x - currentPos.x;
                    const deltaY = lastMousePos.y - currentPos.y;
                    map.panBy([deltaX, deltaY], { animate: false });
                    lastMousePos = currentPos;
                }
            };

            const handleMouseUp = () => {
                isMiddleMouseDown = false;
                lastMousePos = null;
                mapContainer.classList.remove("map-dragging");
            };

            mapContainer.addEventListener("mousedown", handleMouseDown);
            mapContainer.addEventListener("mousemove", handleMouseMove);
            mapContainer.addEventListener("mouseup", handleMouseUp);
            mapContainer.addEventListener("mouseleave", handleMouseUp);

            return () => {
                mapContainer.removeEventListener("mousedown", handleMouseDown);
                mapContainer.removeEventListener("mousemove", handleMouseMove);
                mapContainer.removeEventListener("mouseup", handleMouseUp);
                mapContainer.removeEventListener("mouseleave", handleMouseUp);
            };
        }, [map]);

        // Disable default right-click
        useEffect(() => {
            const mapContainer = map.getContainer();
            const handleContextMenu = (e) => e.preventDefault();
            mapContainer.addEventListener("contextmenu", handleContextMenu);
            return () => mapContainer.removeEventListener("contextmenu", handleContextMenu);
        }, [map]);

        // Vertex dragging
        useEffect(() => {
            const mapContainer = map.getContainer();

            const handleMouseMove = (e) => {
                if (draggingVertexIndex !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    const newCoord = [latlng.lat, latlng.lng];
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[draggingVertexIndex] = newCoord;
                        return updatedCoords;
                    });
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    const endCoord = newPolygonCoords[draggingVertexIndex];
                    if (dragStartCoord) {
                        setActionHistory((prevHistory) => [
                            ...prevHistory,
                            {
                                type: "drag",
                                index: draggingVertexIndex,
                                startCoord: dragStartCoord,
                                endCoord: endCoord,
                            },
                        ]);
                        setRedoHistory([]);
                    }
                    setDraggingVertexIndex(null);
                    setDragStartCoord(null);
                }
            };

            mapContainer.addEventListener("mousemove", handleMouseMove);
            mapContainer.addEventListener("mouseup", handleMouseUp);
            mapContainer.addEventListener("mouseleave", handleMouseUp);

            return () => {
                mapContainer.removeEventListener("mousemove", handleMouseMove);
                mapContainer.removeEventListener("mouseup", handleMouseUp);
                mapContainer.removeEventListener("mouseleave", handleMouseUp);
            };
        }, [map]);

        return null;
    };

    // Keyboard shortcuts
    const handleKeyDown = useCallback(
        (e) => {
            if (!isAdding) return;

            if (e.ctrlKey && e.key === "z" && actionHistory.length > 0) {
                e.preventDefault();
                const lastAction = actionHistory[actionHistory.length - 1];
                setActionHistory((prev) => prev.slice(0, -1));
                setRedoHistory((prev) => [...prev, lastAction]);

                if (lastAction.type === "add") {
                    setNewPolygonCoords((prev) => prev.filter((_, i) => i !== lastAction.index));
                } else if (lastAction.type === "drag") {
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[lastAction.index] = lastAction.startCoord;
                        return updatedCoords;
                    });
                }
            } else if (e.ctrlKey && e.key === "y" && redoHistory.length > 0) {
                e.preventDefault();
                const lastRedo = redoHistory[redoHistory.length - 1];
                setRedoHistory((prev) => prev.slice(0, -1));
                setActionHistory((prev) => [...prev, lastRedo]);

                if (lastRedo.type === "add") {
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords.splice(lastRedo.index, 0, lastRedo.coord);
                        return updatedCoords;
                    });
                } else if (lastRedo.type === "drag") {
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[lastRedo.index] = lastRedo.endCoord;
                        return updatedCoords;
                    });
                }
            } else if (e.ctrlKey && e.key === "x" && newPolygonCoords.length > 0 && !editingPolygonId) {
                e.preventDefault();
                setNewPolygonCoords((prev) => {
                    const lastCoord = prev[prev.length - 1];
                    setActionHistory((prevHistory) => [
                        ...prevHistory,
                        { type: "add", coord: lastCoord, index: prev.length - 1 },
                    ]);
                    setRedoHistory([]);
                    return prev.slice(0, -1);
                });
            }
        },
        [actionHistory, redoHistory, isAdding, newPolygonCoords, editingPolygonId]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Handle image selection and preview
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

        const invalidFiles = files.filter((file) => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid File Type",
                text: "Only JPEG, JPG, and PNG files are allowed.",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setSelectedFiles((prev) => [...prev, ...files]);
        setImagePreviews((prev) => [...prev, ...newPreviews]);
    };

    // Remove selected image and its preview
    const handleRemoveImage = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    // Upload images to project-specific folder and generate signed URLs
    const uploadImages = async (projectTitle, files) => {
        Swal.fire({
            title: "Uploading Images...",
            text: "Please wait while your photos are being compressed and uploaded.",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        const compressedImages = await Promise.all(
            files.map(
                (file) =>
                    new Promise((resolve, reject) => {
                        new Compressor(file, {
                            quality: 0.25,
                            success: (compressedFile) => resolve(compressedFile),
                            error: (err) => {
                                console.error("Compression error:", err);
                                reject(err);
                            },
                        });
                    })
            )
        );

        const imageUrls = await Promise.all(
            compressedImages.map(async (file) => {
                const fileName = `${projectTitle}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from("project-images")
                    .upload(fileName, file);
                if (uploadError) {
                    console.error("Error uploading image:", uploadError);
                    throw uploadError;
                }
                const { data: signedData, error: signedError } = await supabase.storage
                    .from("project-images")
                    .createSignedUrl(fileName, 7200); // 2-hour expiration
                if (signedError) {
                    console.error("Error creating signed URL:", signedError);
                    throw signedError;
                }
                return signedData.signedUrl;
            })
        );

        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Images Uploaded",
            showConfirmButton: false,
            scrollbarPadding: false,
            timer: 1500,
        });

        return imageUrls;
    };

    const handleAddPolygon = async () => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can create projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A polygon must have at least 3 points!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (
            !newTitle ||
            !newContractor ||
            !newContractPayment ||
            !newDateMonitoringStart ||
            !newDateMonitoringEnd ||
            !newProjectEngineer
        ) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide all required fields!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!["Planned", "In Progress", "Completed"].includes(newUpdateStatus)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid update status! Choose Planned, In Progress, or Completed.",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid polygon: The shape cannot have self-intersections!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Creating Project...",
            text: "Please wait while the project is being created.",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            // Fetch address for the new polygon
            const [centerLat, centerLng] = getPolygonCenter(newPolygonCoords);
            const address = await fetchAddress(centerLat, centerLng);

            // Upload images if any
            let imageUrls = [];
            if (selectedFiles.length > 0) {
                imageUrls = await uploadImages(newTitle, selectedFiles);
            }

            const newPolygon = {
                title: newTitle,
                location: address,
                contractor: newContractor,
                contract_payment: newContractPayment,
                update_status: newUpdateStatus,
                date_monitoring_start: newDateMonitoringStart,
                date_monitoring_end: newDateMonitoringEnd,
                issues: newIssues,
                project_engineer: newProjectEngineer,
                color: newColor,
                images: imageUrls,
                coords: [...newPolygonCoords, newPolygonCoords[0]],
                completion_rate: 0,
            };

            const { data, error } = await supabase.from("projects").insert([newPolygon]).select().single();
            if (error) throw error;

            setPolygons((prev) => [...prev, data]);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Project added successfully!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            resetForm();
        } catch (error) {
            console.error("Error adding project:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to add project!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    // Handle update completion rate
    const handleUpdateCompletion = async () => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can update completion rates!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        if (completionRate < 0 || completionRate > 100) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Completion rate must be between 0 and 100!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Updating Completion Rate...",
            text: "Please wait while the completion rate is being updated.",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            const { error } = await supabase
                .from("projects")
                .update({ completion_rate: parseInt(completionRate) })
                .eq("id", selectedPolygonId);
            if (error) throw error;

            setPolygons((prev) =>
                prev.map((polygon) =>
                    polygon.id === selectedPolygonId
                        ? { ...polygon, completion_rate: parseInt(completionRate) }
                        : polygon
                )
            );
            setIsCompletionModalOpen(false);
            setCompletionRate(0);
            setSelectedPolygonId(null);

            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Completion rate updated successfully!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        } catch (error) {
            console.error("Error updating completion rate:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to update completion rate!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    // Handle form submission on Enter key
    const handleFormKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey && isAdding) {
            e.preventDefault();
            if (editingPolygonId) {
                handleSaveEdit();
            } else {
                handleAddPolygon();
            }
        }
    };

    // Delete project and its image folder
    const handleDeletePolygon = async (id) => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can delete projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to delete this project? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
            scrollbarPadding: false,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Get project title to delete its image folder
                    const project = polygons.find((p) => p.id === id);
                    if (project && project.images?.length > 0) {
                        // Delete all files in the project's folder
                        const { data: files, error: listError } = await supabase.storage
                            .from("project-images")
                            .list(project.title);
                        if (listError) throw listError;

                        if (files.length > 0) {
                            const filePaths = files.map((file) => `${project.title}/${file.name}`);
                            const { error: deleteError } = await supabase.storage
                                .from("project-images")
                                .remove(filePaths);
                            if (deleteError) throw deleteError;
                        }
                    }

                    // Delete project from database
                    const { error } = await supabase.from("projects").delete().eq("id", id);
                    if (error) throw error;

                    setPolygons(polygons.filter((polygon) => polygon.id !== id));
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: "Project deleted successfully!",
                        showConfirmButton: false,
                        scrollbarPadding: false,
                        timer: 1500,
                    });
                } catch (error) {
                    console.error("Error deleting project:", error);
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "error",
                        title: "Failed to delete project!",
                        showConfirmButton: false,
                        scrollbarPadding: false,
                        timer: 1500,
                    });
                }
            }
        });
    };

    // Start editing a polygon
    const handleEditPolygon = (id) => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can edit projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        setEditingPolygonId(id);
        const polygonToEdit = polygons.find((p) => p.id === id);
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1));
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(polygonToEdit.title);
        setNewContractor(polygonToEdit.contractor);
        setNewContractPayment(polygonToEdit.contract_payment);
        setNewUpdateStatus(polygonToEdit.update_status);
        setNewDateMonitoringStart(polygonToEdit.date_monitoring_start);
        setNewDateMonitoringEnd(polygonToEdit.date_monitoring_end);
        setNewIssues(polygonToEdit.issues);
        setNewProjectEngineer(polygonToEdit.project_engineer);
        setNewColor(polygonToEdit.color);
        setImagePreviews(polygonToEdit.images || []);
        setSelectedFiles([]);
        setIsAdding(true);
    };

    // Save edited polygon
    const handleSaveEdit = async () => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can edit projects!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A polygon must have at least 3 points!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (
            !newTitle ||
            !newContractor ||
            !newContractPayment ||
            !newDateMonitoringStart ||
            !newDateMonitoringEnd ||
            !newProjectEngineer
        ) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide all required fields!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!["Planned", "In Progress", "Completed"].includes(newUpdateStatus)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid update status! Choose Planned, In Progress, or Completed.",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid polygon: The shape cannot have self-intersections!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Updating Project...",
            text: "Please wait while the project is being updated.",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            // Fetch updated address for the edited polygon
            const [centerLat, centerLng] = getPolygonCenter(newPolygonCoords);
            const address = await fetchAddress(centerLat, centerLng);

            // Upload new images if any
            let imageUrls = imagePreviews.filter((url) => url.startsWith("http"));
            if (selectedFiles.length > 0) {
                const newImageUrls = await uploadImages(newTitle, selectedFiles);
                imageUrls = [...imageUrls, ...newImageUrls];
            }

            const updatedPolygon = {
                title: newTitle,
                location: address,
                contractor: newContractor,
                contract_payment: newContractPayment,
                update_status: newUpdateStatus,
                date_monitoring_start: newDateMonitoringStart,
                date_monitoring_end: newDateMonitoringEnd,
                issues: newIssues,
                project_engineer: newProjectEngineer,
                color: newColor,
                images: imageUrls,
                coords: [...newPolygonCoords, newPolygonCoords[0]],
            };

            const { data, error } = await supabase
                .from("projects")
                .update(updatedPolygon)
                .eq("id", editingPolygonId)
                .select()
                .single();
            if (error) throw error;

            setPolygons((prev) =>
                prev.map((polygon) => (polygon.id === editingPolygonId ? data : polygon))
            );
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Project updated successfully!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            resetForm();
        } catch (error) {
            console.error("Error updating project:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to update project!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    // Reset form
    const resetForm = () => {
        setNewPolygonCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle("");
        setNewContractor("");
        setNewContractPayment("");
        setNewUpdateStatus("Planned");
        setNewDateMonitoringStart("");
        setNewDateMonitoringEnd("");
        setNewIssues("");
        setNewProjectEngineer("");
        setNewColor("Satisfactory");
        setSelectedFiles([]);
        setImagePreviews([]);
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null);
        setDragStartCoord(null);
    };

    // Polygon styling
    const getPolygonStyle = (color, status) => {
        const baseStyle =
            {
                Satisfactory: { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 },
                "With Serious Deficiencies": { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 },
                "With Minor Deficiencies": { fillColor: "rgba(255, 165, 0, 0.5)", color: "orange", weight: 2 },
            }[color] || { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };

        return {
            ...baseStyle,
            dashArray: status === "Completed" ? "5, 5" : status === "In Progress" ? "10, 10" : null,
        };
    };

    // Handle "See more..." click
    const handleSeeMore = (polygon) => {
        setSelectedPolygon(polygon);
        setIsDetailModalOpen(true);
    };

    // Handle image click for larger view
    const handleImageClick = (image) => {
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    // Toggle images expansion
    const toggleImages = (polygonId) => {
        setExpandedImages((prev) => ({
            ...prev,
            [polygonId]: !prev[polygonId],
        }));
    };

    return (
        <div className="p-4 mx-auto">
            {/* Buttons Section */}
            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => isAdmin && !isAdding && setIsAdding(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${isAdding || !isAdmin ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    disabled={isAdding || !isAdmin}
                    whileHover={{ scale: isAdding || !isAdmin ? 1 : 1.05 }}
                    whileTap={{ scale: isAdding || !isAdmin ? 1 : 0.95 }}
                >
                    <FaMapMarkedAlt />
                    Create Project Area
                </motion.button>
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaMap />
                    View All Projects
                </motion.button>
            </div>

            {/* Main Content Section */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Section: Map and Legends */}
                <AnimatePresence>
                    <motion.div
                        key="map-section"
                        className={`flex flex-col gap-6 ${isAdding ? "w-full lg:w-2/3" : "w-full"}`}
                        initial={{ width: "100%", opacity: 0.8, scale: 0.95 }}
                        animate={{ width: isAdding ? "66.67%" : "100%", opacity: 1, scale: 1 }}
                        exit={{ width: "100%", opacity: 0.8, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <motion.div
                            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden relative z-10"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            <MapContainer
                                center={bonbonCoords}
                                zoom={17} // Increased zoom level for closer focus
                                maxZoom={19}
                                style={{ height: "100%", width: "100%", zIndex: 10 }}
                            >
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="Street Map">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            maxZoom={19}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Satellite">
                                        <TileLayer
                                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                            attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                            maxZoom={20}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Terrain">
                                        <TileLayer
                                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                            attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                            maxZoom={17}
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Grayscale">
                                        <TileLayer
                                            url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                            attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            maxZoom={20}
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>
                                {polygons.map((polygon) => (
                                    <Polygon
                                        key={polygon.id}
                                        positions={polygon.coords}
                                        pathOptions={getPolygonStyle(polygon.color, polygon.update_status)}
                                    >
                                        <Popup>
                                            <div className="p-2 w-64">
                                                <h3 className="font-semibold">{polygon.title}</h3>
                                                <p>
                                                    <strong>Location:</strong> {polygon.location}
                                                </p>
                                                <p>
                                                    <strong>Contractor:</strong> {polygon.contractor}
                                                </p>
                                                <p>
                                                    <strong>Contract Payment:</strong> ₱
                                                    {formatNumberWithCommas(polygon.contract_payment)}
                                                </p>
                                                <p>
                                                    <strong>Update Status:</strong> {polygon.update_status}
                                                </p>
                                                <p>
                                                    <strong>Completion:</strong> {polygon.completion_rate || 0}%
                                                </p>
                                                <p>
                                                    <strong>Date Monitoring:</strong> {polygon.date_monitoring_start} to{" "}
                                                    {polygon.date_monitoring_end}
                                                </p>
                                                <p>
                                                    <strong>Issues:</strong> {polygon.issues || "None"}
                                                </p>
                                                <p>
                                                    <strong>Project Engineer:</strong> {polygon.project_engineer}
                                                </p>
                                                <button
                                                    onClick={() => handleSeeMore(polygon)}
                                                    className="text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                                >
                                                    <FaInfoCircle /> See more...
                                                </button>
                                                {isAdmin && (
                                                    <div className="mt-3 flex gap-2 flex-wrap">
                                                        <motion.button
                                                            onClick={() => handleEditPolygon(polygon.id)}
                                                            className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaHeading />
                                                            Edit
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDeletePolygon(polygon.id)}
                                                            className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaTrash />
                                                            Delete
                                                        </motion.button>
                                                    </div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Polygon>
                                ))}
                                {newPolygonCoords.length > 0 && (
                                    <Polygon
                                        positions={newPolygonCoords}
                                        pathOptions={{
                                            fillColor: "rgba(255, 165, 0, 0.5)",
                                            color: "orange",
                                            weight: 2,
                                        }}
                                    />
                                )}
                                {isAdding &&
                                    newPolygonCoords.map((coord, index) => (
                                        <CircleMarker
                                            key={`new-${index}`}
                                            center={coord}
                                            radius={6}
                                            pathOptions={{
                                                color: "orange",
                                                fillColor: "orange",
                                                fillOpacity: 1,
                                            }}
                                            eventHandlers={{
                                                mousedown: (e) => {
                                                    if (e.originalEvent.button === 2) {
                                                        L.DomEvent.preventDefault(e);
                                                        setDraggingVertexIndex(index);
                                                        setDragStartCoord(coord);
                                                    }
                                                },
                                            }}
                                        />
                                    ))}
                                <MapClickHandler />
                                <TileErrorHandler />
                            </MapContainer>
                        </motion.div>

                        {/* Legends Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                    <FaMapMarkedAlt className="text-blue-600" />
                                    Keyboard Shortcuts
                                </h3>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Left Click:</strong> Add point
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Right Click:</strong> Move point
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaUndo className="text-gray-500" /> <strong>Ctrl + Z:</strong> Undo last
                                        action
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaRedo className="text-gray-500" /> <strong>Ctrl + Y:</strong> Redo last
                                        action
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaTrash className="text-gray-500" /> <strong>Ctrl + X:</strong> Remove last
                                        point (new polygons only)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Middle Mouse:</strong> Drag map
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                    <FaTag className="text-blue-600" />
                                    Project Statuses & Types
                                </h3>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Satisfactory
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-500 rounded-full"></div> With Minor
                                        Deficiencies
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded-full"></div> With Serious
                                        Deficiencies
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500"></div> Planned
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-dashed"></div> In
                                        Progress
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-dotted"></div>
                                        Completed
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Right Section: Input Form */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            key="form-section"
                            className="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-lg"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            onKeyDown={handleFormKeyDown}
                        >
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FaMapMarkedAlt className="text-blue-600" />
                                {editingPolygonId ? "Edit Project" : "Add Project"}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaHeading className="text-gray-500" />
                                        Project Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter project title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaUser className="text-gray-500" />
                                        Contractor
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter contractor name"
                                        value={newContractor}
                                        onChange={(e) => setNewContractor(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaMoneyBillWave className="text-gray-500" />
                                        Contract Payment
                                    </label>
                                    <div className="mt-1 flex rounded-lg shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                            ₱
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="e.g., 1,000,000"
                                            value={formatNumberWithCommas(newContractPayment)}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, "");
                                                setNewContractPayment(value);
                                            }}
                                            className="flex-1 px-3 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaTag className="text-gray-500" />
                                        Update Status
                                    </label>
                                    <select
                                        value={newUpdateStatus}
                                        onChange={(e) => setNewUpdateStatus(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="Planned">Planned</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-gray-500" />
                                        Date Monitoring
                                    </label>
                                    <div className="flex gap-2 flex-col sm:flex-row">
                                        <input
                                            type="date"
                                            value={newDateMonitoringStart}
                                            onChange={(e) => setNewDateMonitoringStart(e.target.value)}
                                            className="mt-1 w-full sm:w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        <input
                                            type="date"
                                            value={newDateMonitoringEnd}
                                            onChange={(e) => setNewDateMonitoringEnd(e.target.value)}
                                            className="mt-1 w-full sm:w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaExclamationCircle className="text-gray-500" />
                                        Issues
                                    </label>
                                    <textarea
                                        placeholder="Enter any issues"
                                        value={newIssues}
                                        onChange={(e) => setNewIssues(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaUser className="text-gray-500" />
                                        Project Engineer
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter project engineer name"
                                        value={newProjectEngineer}
                                        onChange={(e) => setNewProjectEngineer(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaTag className="text-gray-500" />
                                        Project Color
                                    </label>
                                    <select
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="Satisfactory">Satisfactory (Blue)</option>
                                        <option value="With Minor Deficiencies">With Minor Deficiencies (Orange)</option>
                                        <option value="With Serious Deficiencies">
                                            With Serious Deficiencies (Red)
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaImage className="text-gray-500" />
                                        Select Images
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        multiple
                                        onChange={handleImageSelect}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index}`}
                                                        className="w-full h-24 object-cover rounded"
                                                    />
                                                    <motion.button
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <FaTimes size={12} />
                                                    </motion.button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <motion.button
                                        onClick={editingPolygonId ? handleSaveEdit : handleAddPolygon}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaSave />
                                        {editingPolygonId ? "Save Changes" : "Create Project"}
                                    </motion.button>
                                    <motion.button
                                        onClick={resetForm}
                                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaBan />
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal for All Projects */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col z-50"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaMap className="text-blue-600" />
                                    All Projects
                                </h2>
                                <motion.button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            {/* Filter Section */}
                            <div className="p-4 border-b">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
                                        <input
                                            type="text"
                                            placeholder="Enter project title"
                                            value={filterTitle}
                                            onChange={(e) => setFilterTitle(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="Planned">Planned</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                        <select
                                            value={filterColor}
                                            onChange={(e) => setFilterColor(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">All Colors</option>
                                            <option value="Satisfactory">Satisfactory</option>
                                            <option value="With Minor Deficiencies">With Minor Deficiencies</option>
                                            <option value="With Serious Deficiencies">With Serious Deficiencies</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Completion Rate (%)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                value={filterCompletionMin}
                                                onChange={(e) => setFilterCompletionMin(e.target.value)}
                                                min="0"
                                                max="100"
                                                className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                value={filterCompletionMax}
                                                onChange={(e) => setFilterCompletionMax(e.target.value)}
                                                min="0"
                                                max="100"
                                                className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Date Range</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={filterDateStart}
                                                onChange={(e) => setFilterDateStart(e.target.value)}
                                                className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                            <input
                                                type="date"
                                                value={filterDateEnd}
                                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                                className="w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <motion.button
                                            onClick={() => {
                                                setFilterTitle("");
                                                setFilterStatus("");
                                                setFilterColor("");
                                                setFilterCompletionMin("");
                                                setFilterCompletionMax("");
                                                setFilterDateStart("");
                                                setFilterDateEnd("");
                                            }}
                                            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FaBan />
                                            Clear Filters
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                            {/* Projects List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredPolygons.length === 0 ? (
                                    <p className="text-gray-500 text-center">No projects match the filters.</p>
                                ) : (
                                    filteredPolygons.map((polygon) => (
                                        <motion.div
                                            key={polygon.id}
                                            className="mb-6 p-4 bg-gray-50 rounded-lg shadow"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <h3 className="text-lg font-semibold">{polygon.title}</h3>
                                            <p className="text-sm text-gray-600">
                                                <strong>Location:</strong> {polygon.location}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Contractor:</strong> {polygon.contractor}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Contract Payment:</strong> ₱{formatNumberWithCommas(polygon.contract_payment)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Update Status:</strong> {polygon.update_status}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Completion:</strong> {polygon.completion_rate || 0}%
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Date Monitoring:</strong> {polygon.date_monitoring_start} to{" "}
                                                {polygon.date_monitoring_end}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Issues:</strong> {polygon.issues || "None"}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Project Engineer:</strong> {polygon.project_engineer}
                                            </p>
                                            <div className="mt-2">
                                                <motion.button
                                                    onClick={() => toggleImages(polygon.id)}
                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaImage />
                                                    {expandedImages[polygon.id]
                                                        ? "Hide Images"
                                                        : `Show Images (${polygon.images?.length || 0})`}
                                                </motion.button>
                                                <AnimatePresence>
                                                    {expandedImages[polygon.id] && polygon.images?.length > 0 && (
                                                        <motion.div
                                                            className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            {polygon.images.map((image, index) => (
                                                                <img
                                                                    key={index}
                                                                    src={image}
                                                                    alt={`Project ${index}`}
                                                                    className="w-full h-32 object-cover rounded cursor-pointer"
                                                                    onClick={() => handleImageClick(image)}
                                                                />
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="mt-4 h-64 rounded-lg overflow-hidden relative z-10">
                                                <MapContainer
                                                    center={getPolygonCenter(polygon.coords)}
                                                    zoom={17} // Increased zoom level for closer focus
                                                    maxZoom={19}
                                                    style={{ height: "100%", width: "100%", zIndex: 10 }}
                                                    scrollWheelZoom={false}
                                                >
                                                    <LayersControl position="topright">
                                                        <LayersControl.BaseLayer checked name="Street Map">
                                                            <TileLayer
                                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                                maxZoom={19}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Satellite">
                                                            <TileLayer
                                                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                                attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                                                maxZoom={20}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Terrain">
                                                            <TileLayer
                                                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                                                attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                                                maxZoom={17}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Grayscale">
                                                            <TileLayer
                                                                url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                                                attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                                maxZoom={20}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                    </LayersControl>
                                                    <Polygon
                                                        positions={polygon.coords}
                                                        pathOptions={getPolygonStyle(polygon.color, polygon.update_status)}
                                                    />
                                                    <TileErrorHandler />
                                                </MapContainer>
                                            </div>
                                            {isAdmin && (
                                                <div className="mt-3 flex gap-2 flex-wrap">
                                                    <motion.button
                                                        onClick={() => {
                                                            handleEditPolygon(polygon.id);
                                                            setIsModalOpen(false);
                                                        }}
                                                        className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 text-sm"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaHeading />
                                                        Edit
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => handleDeletePolygon(polygon.id)}
                                                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaTrash />
                                                        Delete
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => {
                                                            setSelectedPolygonId(polygon.id);
                                                            setCompletionRate(polygon.completion_rate || 0);
                                                            setIsCompletionModalOpen(true);
                                                        }}
                                                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaPercent />
                                                        Update Completion
                                                    </motion.button>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Detailed View */}
            <AnimatePresence>
                {isDetailModalOpen && selectedPolygon && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col z-50"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaInfoCircle className="text-blue-600" />
                                    Project Details
                                </h2>
                                <motion.button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <h3 className="text-lg font-semibold mb-2">{selectedPolygon.title}</h3>
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Images:</p>
                                    {selectedPolygon.images?.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {selectedPolygon.images.map((image, index) => (
                                                <img
                                                    key={index}
                                                    src={image}
                                                    alt={`Project ${index}`}
                                                    className="w-full h-24 object-cover rounded cursor-pointer"
                                                    onClick={() => handleImageClick(image)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No images available</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        Full Description (Issues):
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {selectedPolygon.issues || "No issues reported"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Larger Image View */}
            <AnimatePresence>
                {isImageModalOpen && selectedImage && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={imageModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[1000]"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaImage className="text-blue-600" />
                                    Image Preview
                                </h2>
                                <motion.button
                                    onClick={() => setIsImageModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="flex-1 p-4 flex items-center justify-center">
                                <img
                                    src={selectedImage}
                                    alt="Large Preview"
                                    className="max-w-full max-h-[70vh] object-contain rounded"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Updating Completion Rate */}
            <AnimatePresence>
                {isCompletionModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={completionModalRef}
                            className="bg-white rounded-lg w-full max-w-md flex flex-col z-50"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaPercent className="text-blue-600" />
                                    Update Completion Rate
                                </h2>
                                <motion.button
                                    onClick={() => setIsCompletionModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="p-4">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                    <FaPercent className="text-gray-500" />
                                    Completion Rate (%)
                                </label>
                                <input
                                    type="number"
                                    value={completionRate}
                                    onChange={(e) => setCompletionRate(e.target.value)}
                                    min="0"
                                    max="100"
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Enter completion rate (0-100)"
                                />
                                <div className="mt-4 flex gap-3">
                                    <motion.button
                                        onClick={handleUpdateCompletion}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaSave />
                                        Save
                                    </motion.button>
                                    <motion.button
                                        onClick={() => setIsCompletionModalOpen(false)}
                                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaBan />
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminProMgmt;