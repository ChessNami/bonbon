import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaTimes, FaPlus, FaEdit, FaTrash, FaEraser, FaMousePointer } from "react-icons/fa";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import Compressor from "compressorjs";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import { ClipLoader } from "react-spinners";

const Calendar = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, events: initialEvents, selectedDates, setSelectedDates }) => {
    const [holidays, setHolidays] = useState([]);
    const [modalData, setModalData] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [userEvents, setUserEvents] = useState(initialEvents || {});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false); // New state for loading events
    const modalRef = useRef(null);
    const eventModalRef = useRef(null);
    const cropperRef = useRef(null);

    const currentYear = new Date().getFullYear();

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const fetchHolidays = useCallback(async () => {
        try {
            const response = await fetch(
                `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/PH`
            );
            const data = await response.json();
            setHolidays(data);
        } catch (error) {
            console.error("Error fetching holidays:", error);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchHolidays();
        fetchUserEvents();
    }, [selectedYear, fetchHolidays]);

    const fetchUserEvents = async () => {
        setIsLoadingEvents(true);
        try {
            const { data, error } = await supabase
                .from("events")
                .select("*");

            if (error) throw error;

            const eventsWithImages = await Promise.all(
                data.map(async (event) => {
                    let imageUrl = null;
                    if (event.image_url) {
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from("event-photos")
                            .createSignedUrl(event.image_url, 3600);
                        if (signedUrlError) {
                            console.error(`Error generating signed URL for event ${event.id}:`, signedUrlError);
                        } else {
                            imageUrl = signedUrlData.signedUrl;
                        }
                    }
                    return { ...event, signedImageUrl: imageUrl };
                })
            );

            const eventsByDate = eventsWithImages.reduce((acc, event) => {
                event.dates.forEach((date) => {
                    acc[date] = acc[date] ? [...acc[date], event] : [event];
                });
                return acc;
            }, {});

            setUserEvents(eventsByDate);
        } catch (error) {
            console.error("Error fetching user events:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Fetch Error",
                text: "Failed to fetch user events: " + error.message,
                showConfirmButton: false,
                timer: 1500,
            });
        } finally {
            setIsLoadingEvents(false);
        }
    };

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const handleDateClick = (dateKey) => {
        if (selectedDates.includes(dateKey)) {
            setSelectedDates(selectedDates.filter((date) => date !== dateKey));
        } else {
            setSelectedDates([...selectedDates, dateKey].sort());
        }
    };

    const handleLongPress = (dateKey) => {
        const holiday = holidays.find((h) => h.date === dateKey);
        const userEventsForDate = userEvents[dateKey] || [];
        setModalData({ dateKey, holiday, userEvents: userEventsForDate });
    };

    const handleCloseModal = () => {
        setModalData(null);
    };

    const handleCloseEventModal = () => {
        setIsEventModalOpen(false);
        setEventDetails({
            title: "",
            date: "",
            startHour: "1",
            startMinute: "00",
            startPeriod: "AM",
            endHour: "1",
            endMinute: "00",
            endPeriod: "AM",
            location: "",
            description: "",
            facebook_link: "",
            image: null,
            image_preview: "",
            croppedImage: null,
        });
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setCurrentEvent(null);
        setEventDetails({
            title: "",
            date: "",
            startHour: "1",
            startMinute: "00",
            startPeriod: "AM",
            endHour: "1",
            endMinute: "00",
            endPeriod: "AM",
            location: "",
            description: "",
            facebook_link: "",
            image: null,
            image_preview: "",
            croppedImage: null,
        });
    };

    const handleClickOutsideModal = useCallback((e) => {
        if (isEditModalOpen && eventModalRef.current && !eventModalRef.current.contains(e.target)) {
            handleCloseEditModal();
        } else if (isEventModalOpen && eventModalRef.current && !eventModalRef.current.contains(e.target)) {
            handleCloseEventModal();
        } else if (modalData && modalRef.current && !modalRef.current.contains(e.target)) {
            handleCloseModal();
        }
    }, [isEventModalOpen, isEditModalOpen, modalData]);

    useEffect(() => {
        if (modalData || isEventModalOpen || isEditModalOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.paddingRight = "15px";
            document.addEventListener("mousedown", handleClickOutsideModal);
        } else {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
            document.removeEventListener("mousedown", handleClickOutsideModal);
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
            document.removeEventListener("mousedown", handleClickOutsideModal);
        };
    }, [modalData, isEventModalOpen, isEditModalOpen, handleClickOutsideModal]);

    const totalSlots = 42;
    const emptySlots = firstDayOfMonth;
    const filledSlots = daysArray.length;
    const remainingSlots = totalSlots - (emptySlots + filledSlots);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.8 },
    };

    const [eventDetails, setEventDetails] = useState({
        title: "",
        date: selectedDates.length > 0 ? selectedDates[0] : "",
        startHour: "1",
        startMinute: "00",
        startPeriod: "AM",
        endHour: "1",
        endMinute: "00",
        endPeriod: "AM",
        location: "",
        description: "",
        facebook_link: "",
        image: null,
        image_preview: "",
        croppedImage: null,
        wholeDay: false,
    });

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
    const periods = ["AM", "PM"];

    const handleEventInputChange = (e) => {
        const { name, value } = e.target;
        setEventDetails({ ...eventDetails, [name]: value });
    };

    const handleWholeDayToggle = () => {
        setEventDetails({ ...eventDetails, wholeDay: !eventDetails.wholeDay });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
            setEventDetails({
                ...eventDetails,
                image: file,
                image_preview: URL.createObjectURL(file),
                croppedImage: null,
            });
        } else {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid File",
                text: "Please upload a JPEG or PNG image.",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();

        if (selectedDates.length === 0) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "warning",
                title: "No Date Selected",
                text: "Please select at least one date.",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }

        const startTime = `${eventDetails.startHour}:${eventDetails.startMinute} ${eventDetails.startPeriod}`;
        const endTime = `${eventDetails.endHour}:${eventDetails.endMinute} ${eventDetails.endPeriod}`;

        try {
            Swal.fire({
                title: "Processing...",
                text: "Please wait while we save the event.",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            let imageUrl = null;
            let eventId = null;

            if (eventDetails.image) {
                if (!cropperRef.current || !cropperRef.current.cropper) {
                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "warning",
                        title: "Cropper Not Initialized",
                        text: "Please wait for the image cropper to load or re-upload the image.",
                        showConfirmButton: false,
                        timer: 1500,
                    });
                    return;
                }

                const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
                    width: 800,
                    height: 450,
                });

                if (!croppedCanvas) {
                    Swal.close();
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "error",
                        title: "Cropping Error",
                        text: "Failed to crop the image. Please adjust the crop area and try again.",
                        showConfirmButton: false,
                        timer: 1500,
                    });
                    return;
                }

                const compressedImage = await new Promise((resolve, reject) => {
                    croppedCanvas.toBlob((blob) => {
                        if (blob) {
                            new Compressor(blob, {
                                quality: 0.8,
                                maxWidth: 1280,
                                maxHeight: 720,
                                success: (compressedResult) => resolve(compressedResult),
                                error: (err) => reject(new Error(`Image compression failed: ${err.message}`)),
                            });
                        } else {
                            reject(new Error("Cropping failed: No blob generated."));
                        }
                    }, "image/jpeg");
                });

                const { data: insertData, error: insertError } = await supabase
                    .from("events")
                    .insert([{
                        title: eventDetails.title,
                        dates: selectedDates,
                        start_time: startTime,
                        end_time: endTime,
                        location: eventDetails.location,
                        description: eventDetails.description,
                        facebook_link: eventDetails.facebook_link,
                        whole_day: eventDetails.wholeDay,
                    }])
                    .select("id");

                if (insertError) throw new Error(`Error inserting event: ${insertError.message}`);

                eventId = insertData[0].id;
                const fileName = `public/event_${eventId}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from("event-photos")
                    .upload(fileName, compressedImage, {
                        cacheControl: "3600",
                        upsert: true,
                    });

                if (uploadError) throw new Error(`Error uploading image: ${uploadError.message}`);

                const { error: updateError } = await supabase
                    .from("events")
                    .update({ image_url: fileName })
                    .eq("id", eventId);

                if (updateError) throw new Error(`Error updating image URL: ${updateError.message}`);

                imageUrl = fileName;
            } else {
                const { error: insertError } = await supabase
                    .from("events")
                    .insert([{
                        title: eventDetails.title,
                        dates: selectedDates,
                        start_time: startTime,
                        end_time: endTime,
                        location: eventDetails.location,
                        description: eventDetails.description,
                        facebook_link: eventDetails.facebook_link,
                        whole_day: eventDetails.wholeDay,
                    }]);

                if (insertError) throw new Error(`Error inserting event: ${insertError.message}`);
            }

            const newEvent = {
                title: eventDetails.title,
                dates: selectedDates,
                start_time: startTime,
                end_time: endTime,
                location: eventDetails.location,
                description: eventDetails.description,
                facebook_link: eventDetails.facebook_link,
                image_url: imageUrl,
                whole_day: eventDetails.wholeDay,
            };
            const updatedEvents = { ...userEvents };
            selectedDates.forEach((date) => {
                updatedEvents[date] = updatedEvents[date] ? [...updatedEvents[date], newEvent] : [newEvent];
            });
            setUserEvents(updatedEvents);

            setEventDetails({
                title: "",
                date: "",
                startHour: "1",
                startMinute: "00",
                startPeriod: "AM",
                endHour: "1",
                endMinute: "00",
                endPeriod: "AM",
                location: "",
                description: "",
                facebook_link: "",
                image: null,
                image_preview: "",
                croppedImage: null,
                wholeDay: false,
            });
            setSelectedDates([]);
            setIsEventModalOpen(false);

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Event created successfully",
                showConfirmButton: false,
                timer: 1500,
            });

            fetchUserEvents();
        } catch (error) {
            Swal.close();
            console.error("Error in handleCreateEvent:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Operation Failed",
                text: error.message || "An unexpected error occurred. Please try again.",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    const clearSelectedDates = () => {
        setSelectedDates([]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Selected dates cleared",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const handleEditEvent = (event) => {
        setCurrentEvent(event);
        setEventDetails({
            title: event.title,
            date: event.dates[0],
            startHour: event.start_time.split(":")[0],
            startMinute: event.start_time.split(":")[1].split(" ")[0],
            startPeriod: event.start_time.split(" ")[1],
            endHour: event.end_time.split(":")[0],
            endMinute: event.end_time.split(":")[1].split(" ")[0],
            endPeriod: event.end_time.split(" ")[1],
            location: event.location,
            description: event.description,
            facebook_link: event.facebook_link || "",
            wholeDay: event.whole_day,
            image: null,
            image_preview: "",
            croppedImage: null,
        });
        setSelectedDates(event.dates);
        setIsEditModalOpen(true);
        setModalData(null); // Close event details modal
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();

        if (selectedDates.length === 0) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "warning",
                title: "No Date Selected",
                text: "Please select at least one date.",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }

        const startTime = `${eventDetails.startHour}:${eventDetails.startMinute} ${eventDetails.startPeriod}`;
        const endTime = `${eventDetails.endHour}:${eventDetails.endMinute} ${eventDetails.endPeriod}`;

        try {
            Swal.fire({
                title: "Processing...",
                text: "Please wait while we update the event.",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const { error: updateError } = await supabase
                .from("events")
                .update({
                    title: eventDetails.title,
                    dates: selectedDates,
                    start_time: startTime,
                    end_time: endTime,
                    location: eventDetails.location,
                    description: eventDetails.description,
                    facebook_link: eventDetails.facebook_link,
                    whole_day: eventDetails.wholeDay,
                })
                .eq("id", currentEvent.id);

            if (updateError) throw new Error(`Error updating event: ${updateError.message}`);

            const updatedEvent = {
                id: currentEvent.id,
                title: eventDetails.title,
                dates: selectedDates,
                start_time: startTime,
                end_time: endTime,
                location: eventDetails.location,
                description: eventDetails.description,
                facebook_link: eventDetails.facebook_link,
                whole_day: eventDetails.wholeDay,
            };
            const updatedEvents = { ...userEvents };
            selectedDates.forEach((date) => {
                updatedEvents[date] = updatedEvents[date] ? updatedEvents[date].map(evt => evt.id === currentEvent.id ? updatedEvent : evt) : [updatedEvent];
            });
            setUserEvents(updatedEvents);

            setEventDetails({
                title: "",
                date: "",
                startHour: "1",
                startMinute: "00",
                startPeriod: "AM",
                endHour: "1",
                endMinute: "00",
                endPeriod: "AM",
                location: "",
                description: "",
                facebook_link: "",
                image: null,
                image_preview: "",
                croppedImage: null,
                wholeDay: false,
            });
            setSelectedDates([]);
            setIsEditModalOpen(false);

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Event updated successfully",
                showConfirmButton: false,
                timer: 1500,
            });

            fetchUserEvents();
        } catch (error) {
            Swal.close();
            console.error("Error in handleUpdateEvent:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Operation Failed",
                text: error.message || "An unexpected error occurred. Please try again.",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    const handleDeleteEvent = async (event) => {
        try {
            Swal.fire({
                title: "Are you sure?",
                text: "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
                cancelButtonText: "No, keep it",
            }).then(async (result) => {
                if (result.isConfirmed) {
                    if (event.image_url) {
                        const { error: deleteImageError } = await supabase.storage
                            .from("event-photos")
                            .remove([event.image_url]);
                        if (deleteImageError) throw new Error(`Error deleting image: ${deleteImageError.message}`);
                    }

                    const { error: deleteError } = await supabase
                        .from("events")
                        .delete()
                        .eq("id", event.id);

                    if (deleteError) throw new Error(`Error deleting event: ${deleteError.message}`);

                    const updatedEvents = { ...userEvents };
                    event.dates.forEach((date) => {
                        updatedEvents[date] = updatedEvents[date].filter(evt => evt.id !== event.id);
                        if (updatedEvents[date].length === 0) delete updatedEvents[date];
                    });
                    setUserEvents(updatedEvents);

                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: "Event deleted successfully",
                        showConfirmButton: false,
                        timer: 1500,
                    });

                    fetchUserEvents();
                    setModalData(null);
                }
            });
        } catch (error) {
            console.error("Error in handleDeleteEvent:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Delete Failed",
                text: error.message || "An unexpected error occurred. Please try again.",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return `${text.substring(0, maxLength)}...`;
    };

    return (
        <motion.div
            className="bg-white p-4 rounded-lg shadow select-none w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                className="flex flex-col md:flex-row md:justify-between items-center mb-4 gap-2"
                variants={itemVariants}
            >
                <div className="flex gap-2">
                    <motion.button
                        onClick={handlePrevMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronLeft size={20} />
                    </motion.button>
                    <motion.button
                        onClick={handleNextMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronRight size={20} />
                    </motion.button>
                    <motion.button
                        onClick={() => {
                            if (selectedDates.length > 0) {
                                setIsEventModalOpen(true);
                                setModalData(null); // Close event details modal if open
                            } else {
                                Swal.fire({
                                    toast: true,
                                    position: "top-end",
                                    icon: "warning",
                                    title: "No Date Selected",
                                    text: "Please select at least one date before creating an event.",
                                    showConfirmButton: false,
                                    timer: 1500,
                                });
                            }
                        }}
                        className={`p-2 rounded transition ${selectedDates.length > 0
                            ? "bg-green-200 hover:bg-green-300 active:bg-green-400"
                            : "bg-gray-300 cursor-not-allowed opacity-50"
                            }`}
                        whileHover={selectedDates.length > 0 ? { scale: 1.1 } : {}}
                        whileTap={selectedDates.length > 0 ? { scale: 0.9 } : {}}
                    >
                        <FaPlus size={20} />
                    </motion.button>
                    <motion.button
                        onClick={clearSelectedDates}
                        className={`p-2 rounded transition ${selectedDates.length > 0
                            ? "bg-green-200 hover:bg-green-300 active:bg-green-400"
                            : "bg-gray-300 cursor-not-allowed opacity-50"
                            }`}
                        whileHover={selectedDates.length > 0 ? { scale: 1.1 } : {}}
                        whileTap={selectedDates.length > 0 ? { scale: 0.9 } : {}}
                    >
                        <FaEraser size={20} />
                    </motion.button>
                </div>
                <motion.div
                    className="font-bold text-lg sm:text-xl md:text-2xl uppercase underline underline-offset-4 text-center"
                    variants={itemVariants}
                >
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                </motion.div>

                <div className="flex gap-2 items-center">
                    <motion.select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                                {new Date(currentYear, month - 1, 1).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </motion.select>

                    <motion.select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                    >
                        {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </motion.select>
                </div>
            </motion.div>

            <div className="border-b border-gray-300 my-4"></div>

            <motion.div
                className="grid grid-cols-7 text-center font-semibold text-sm sm:text-base"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {weekDays.map((day, index) => (
                    <motion.div
                        key={day}
                        className={`p-2 ${index === 0 ? "text-red-500" : ""}`}
                        variants={itemVariants}
                    >
                        {day}
                    </motion.div>
                ))}
            </motion.div>

            <motion.div
                className="grid grid-cols-7 gap-1"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {Array.from({ length: emptySlots }, (_, i) => (
                    <motion.div
                        key={`empty-${i}`}
                        className="p-2 border rounded-lg h-12 sm:h-16 md:h-24 relative overflow-hidden bg-gray-100"
                        variants={itemVariants}
                    >
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1 left-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                            <div className="absolute top-1 right-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 left-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                        </div>
                    </motion.div>
                ))}
                {daysArray.map((day) => {
                    const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
                    const holiday = holidays.find((h) => h.date === dateKey);
                    const isSelected = selectedDates.includes(dateKey);
                    const selectionIndex = selectedDates.indexOf(dateKey) + 1;
                    const today = new Date();
                    const isToday =
                        today.getFullYear() === selectedYear &&
                        today.getMonth() + 1 === selectedMonth &&
                        today.getDate() === day;
                    const hasEvents = userEvents[dateKey]?.length > 0;

                    return (
                        <motion.div
                            key={day}
                            className={`relative p-2 border rounded-lg h-12 sm:h-16 md:h-24 cursor-pointer text-xs sm:text-sm md:text-base 
                            flex flex-col items-center justify-center group
                            ${isSunday ? "text-red-500 bg-red-100" : ""}
                            ${holiday ? "bg-green-100" : ""}
                            ${isSelected ? "bg-blue-200 border-blue-500" : ""}
                            ${isToday ? "bg-yellow-200 border-yellow-500" : ""}`}
                            onClick={() => handleDateClick(dateKey)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPress(dateKey);
                            }}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="absolute top-1 right-1 text-xs font-bold">{day}</span>
                            {isSelected && <span className="text-blue-600 font-bold">{selectionIndex}</span>}
                            {holiday && <div className="hidden md:block text-xs bg-green-200 p-1 rounded">{holiday.localName}</div>}
                            {userEvents[dateKey]?.map((event, idx) => (
                                <div
                                    key={idx}
                                    className="hidden md:block text-xs bg-blue-100 p-1 mt-1 rounded w-full text-center truncate"
                                >
                                    {truncateText(event.title, 10)}
                                </div>
                            ))}
                            {hasEvents && (
                                <div className="absolute bottom-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                        </motion.div>
                    );
                })}
                {Array.from({ length: remainingSlots }, (_, i) => (
                    <motion.div
                        key={`empty-end-${i}`}
                        className="p-2 border rounded-lg h-12 sm:h-16 md:h-24 relative overflow-hidden bg-gray-100"
                        variants={itemVariants}
                    >
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1 left-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                            <div className="absolute top-1 right-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 left-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div className="mt-4 border-t pt-4" variants={itemVariants}>
                <h3 className="text-lg font-bold mb-2">Legend</h3>
                <motion.div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-yellow-200 border border-yellow-500 rounded"></div>
                        <span>Today</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
                        <span>Sunday</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                        <span>Holiday</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-blue-200 border border-blue-500 rounded"></div>
                        <span>Selected Date</span>
                    </motion.div>
                </motion.div>

                <motion.div className="mt-4 border-t pt-4" variants={itemVariants}>
                    <h3 className="text-lg font-bold mb-2">Control Guides</h3>
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div className="flex items-center gap-2" variants={itemVariants}>
                            <FaMousePointer size={16} />
                            <span><strong>Left Click:</strong> Select Dates</span>
                        </motion.div>
                        <motion.div className="flex items-center gap-2" variants={itemVariants}>
                            <FaMousePointer size={16} />
                            <span><strong>Right Click:</strong> Show Events</span>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {modalData && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-lg shadow-lg w-11/12 max-w-md md:max-w-lg max-h-[80vh] overflow-y-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center sticky top-0 bg-white z-10 p-4 border-b">
                                <h2 className="text-lg font-bold">Events on {modalData.dateKey}</h2>
                                <motion.button
                                    onClick={handleCloseModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={20} />
                                </motion.button>
                            </div>
                            <div className="p-4">
                                {isLoadingEvents ? (
                                    <div className="flex justify-center items-center py-8">
                                        <ClipLoader color="#3B82F6" size={50} />
                                    </div>
                                ) : (
                                    <>
                                        {modalData.holiday && (
                                            <div className="mb-4">
                                                <span className="font-bold">Holiday:</span> {modalData.holiday.localName}
                                            </div>
                                        )}
                                        {modalData.userEvents.length > 0 ? (
                                            modalData.userEvents.map((event, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    className="bg-blue-100 p-4 rounded mb-4"
                                                    variants={itemVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                >
                                                    <h3 className="font-bold">{event.title}</h3>
                                                    <p>
                                                        <span className="font-bold">Dates:</span> {event.dates.join(", ")}
                                                    </p>
                                                    <p>
                                                        <span className="font-bold">Time:</span>{" "}
                                                        {event.whole_day ? "Whole Day" : `${event.start_time} - ${event.end_time}`}
                                                    </p>
                                                    <p>
                                                        <span className="font-bold">Location:</span> {event.location}
                                                    </p>
                                                    <p>
                                                        <span className="font-bold">Description:</span> {event.description || "N/A"}
                                                    </p>
                                                    {event.facebook_link && (
                                                        <p>
                                                            <span className="font-bold">Facebook Post:</span>{" "}
                                                            <a href={event.facebook_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                                                View Post
                                                            </a>
                                                        </p>
                                                    )}
                                                    {event.signedImageUrl && (
                                                        <img
                                                            src={event.signedImageUrl}
                                                            alt={event.title}
                                                            className="mt-2 w-full h-full object-cover rounded"
                                                            onError={(e) => (e.target.src = "https://via.placeholder.com/800x450")}
                                                        />
                                                    )}
                                                    <div className="flex justify-end space-x-2 mt-2">
                                                        <motion.button
                                                            onClick={() => handleEditEvent(event)}
                                                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaEdit className="mr-1" /> Edit
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDeleteEvent(event)}
                                                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaTrash className="mr-1" /> Delete
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500">No user-created events.</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEventModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={eventModalRef}
                            className="bg-white rounded-lg shadow-lg w-11/12 max-w-md md:max-w-lg mx-4 h-[90vh] flex flex-col"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-bold">Create New Event</h2>
                                <motion.button
                                    onClick={handleCloseEventModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={20} />
                                </motion.button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1">
                                <form onSubmit={handleCreateEvent} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Event Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={eventDetails.title}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Dates</label>
                                        <input
                                            type="text"
                                            value={selectedDates.join(", ")}
                                            readOnly
                                            className="w-full p-2 border rounded bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Whole Day?</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={eventDetails.wholeDay}
                                                onChange={handleWholeDayToggle}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{eventDetails.wholeDay ? "Yes" : "No"}</span>
                                        </label>
                                    </div>
                                    {!eventDetails.wholeDay && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Start Time</label>
                                                <div className="flex flex-wrap space-x-2 items-center">
                                                    <select
                                                        name="startHour"
                                                        value={eventDetails.startHour}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {hours.map((hour) => (
                                                            <option key={hour} value={hour}>
                                                                {hour}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span>:</span>
                                                    <select
                                                        name="startMinute"
                                                        value={eventDetails.startMinute}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {minutes.map((minute) => (
                                                            <option key={minute} value={minute}>
                                                                {minute}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        name="startPeriod"
                                                        value={eventDetails.startPeriod}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {periods.map((period) => (
                                                            <option key={period} value={period}>
                                                                {period}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">End Time</label>
                                                <div className="flex flex-wrap space-x-2 items-center">
                                                    <select
                                                        name="endHour"
                                                        value={eventDetails.endHour}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {hours.map((hour) => (
                                                            <option key={hour} value={hour}>
                                                                {hour}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span>:</span>
                                                    <select
                                                        name="endMinute"
                                                        value={eventDetails.endMinute}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {minutes.map((minute) => (
                                                            <option key={minute} value={minute}>
                                                                {minute}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        name="endPeriod"
                                                        value={eventDetails.endPeriod}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {periods.map((period) => (
                                                            <option key={period} value={period}>
                                                                {period}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Location</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={eventDetails.location}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            value={eventDetails.description}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Facebook Post Link</label>
                                        <input
                                            type="url"
                                            name="facebook_link"
                                            value={eventDetails.facebook_link}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            placeholder="https://www.facebook.com/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Upload Image (JPEG/PNG)</label>
                                        <input
                                            type="file"
                                            accept="image/jpeg, image/png"
                                            onChange={handleImageUpload}
                                            className="w-full p-2 border rounded mb-2"
                                        />
                                        {eventDetails.image_preview && (
                                            <Cropper
                                                ref={cropperRef}
                                                src={eventDetails.image_preview}
                                                style={{ height: 350, width: "100%" }}
                                                aspectRatio={16 / 9}
                                                initialAspectRatio={16 / 9}
                                                guides={true}
                                                cropBoxMovable={true}
                                                cropBoxResizable={true}
                                                zoomable={true}
                                                scalable={true}
                                                viewMode={1}
                                                dragMode="none"
                                                checkCrossOrigin={false}
                                            />
                                        )}
                                    </div>
                                    <motion.button
                                        type="submit"
                                        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 transition"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Create Event
                                    </motion.button>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEditModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={eventModalRef}
                            className="bg-white rounded-lg shadow-lg w-11/12 max-w-md md:max-w-lg mx-4 h-[90vh] flex flex-col"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-bold">Edit Event</h2>
                                <motion.button
                                    onClick={handleCloseEditModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={20} />
                                </motion.button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1">
                                <form onSubmit={handleUpdateEvent} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Event Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={eventDetails.title}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Dates</label>
                                        <input
                                            type="text"
                                            value={selectedDates.join(", ")}
                                            readOnly
                                            className="w-full p-2 border rounded bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Whole Day?</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={eventDetails.wholeDay}
                                                onChange={handleWholeDayToggle}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{eventDetails.wholeDay ? "Yes" : "No"}</span>
                                        </label>
                                    </div>
                                    {!eventDetails.wholeDay && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Start Time</label>
                                                <div className="flex flex-wrap space-x-2 items-center">
                                                    <select
                                                        name="startHour"
                                                        value={eventDetails.startHour}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {hours.map((hour) => (
                                                            <option key={hour} value={hour}>
                                                                {hour}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span>:</span>
                                                    <select
                                                        name="startMinute"
                                                        value={eventDetails.startMinute}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {minutes.map((minute) => (
                                                            <option key={minute} value={minute}>
                                                                {minute}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        name="startPeriod"
                                                        value={eventDetails.startPeriod}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {periods.map((period) => (
                                                            <option key={period} value={period}>
                                                                {period}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">End Time</label>
                                                <div className="flex flex-wrap space-x-2 items-center">
                                                    <select
                                                        name="endHour"
                                                        value={eventDetails.endHour}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {hours.map((hour) => (
                                                            <option key={hour} value={hour}>
                                                                {hour}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span>:</span>
                                                    <select
                                                        name="endMinute"
                                                        value={eventDetails.endMinute}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {minutes.map((minute) => (
                                                            <option key={minute} value={minute}>
                                                                {minute}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        name="endPeriod"
                                                        value={eventDetails.endPeriod}
                                                        onChange={handleEventInputChange}
                                                        className="p-2 border rounded w-1/4 sm:w-20"
                                                    >
                                                        {periods.map((period) => (
                                                            <option key={period} value={period}>
                                                                {period}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Location</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={eventDetails.location}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            value={eventDetails.description}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Facebook Post Link</label>
                                        <input
                                            type="url"
                                            name="facebook_link"
                                            value={eventDetails.facebook_link}
                                            onChange={handleEventInputChange}
                                            className="w-full p-2 border rounded"
                                            placeholder="https://www.facebook.com/..."
                                        />
                                    </div>
                                    <motion.button
                                        type="submit"
                                        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 transition"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Update Event
                                    </motion.button>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Calendar;