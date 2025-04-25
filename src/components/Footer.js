import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const Footer = () => {
    const [footerData, setFooterData] = useState({
        left_info: { address: "", telephone: "", email: "" },
        center_info: [],
        right_info: [],
        logosize: 16, // Default size maps to h-16, w-16 (4rem/64px)
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchFooterData = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("footer_config")
            .select("*")
            .single();

        if (error) {
            console.error("Error fetching footer data:", error);
            setIsLoading(false);
        } else {
            setFooterData(data || {
                left_info: { address: "", telephone: "", email: "" },
                center_info: [],
                right_info: [],
                logosize: 16,
            });
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchFooterData();

        // Subscribe to real-time updates for both INSERT and UPDATE
        const subscription = supabase
            .channel('footer_config_changes')
            .on('postgres_changes', {
                event: ['UPDATE', 'INSERT'], // Listen for both updates and inserts
                schema: 'public',
                table: 'footer_config',
            }, (payload) => {
                console.log('Change received!', payload);
                fetchFooterData(); // Refetch data when an update or insert occurs
            })
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, [fetchFooterData]);

    if (isLoading) {
        return (
            <footer className="bg-gray-800 text-white p-4">
                <div className="container mx-auto">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="w-full text-center animate-pulse">
                            <h3 className="font-semibold text-lg mb-2">Contact Information</h3>
                            <p className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></p>
                            <p className="h-4 bg-gray-300 rounded w-1/2 mx-auto mb-2"></p>
                            <p className="h-4 bg-gray-300 rounded w-2/3 mx-auto"></p>
                        </div>
                        <div className="w-full flex justify-center animate-pulse">
                            <div className="flex flex-wrap gap-4 justify-center">
                                {[1, 2, 3].map((_, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-gray-300 rounded"></div>
                                        <p className="h-4 bg-gray-300 rounded w-16"></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full flex justify-center animate-pulse">
                            <div className="flex flex-wrap gap-4 justify-center">
                                {[1, 2].map((_, index) => (
                                    <div key={index} className="w-16 h-16 bg-gray-300 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-gray-800 text-white p-4">
            <div className="container mx-auto">
                <div className="flex flex-col items-center space-y-6 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-4">
                    {/* Left Section */}
                    <div className="w-full text-center sm:w-1/3 sm:text-left">
                        <h3 className="font-semibold text-lg sm:text-xl mb-2">Contact Information</h3>
                        <address className="text-sm sm:text-md space-y-2 not-italic">
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
                                <p>Email: {footerData.left_info.email}</p>
                            ) : (
                                <p className="text-gray-400">No email provided</p>
                            )}
                        </address>
                    </div>

                    {/* Center Section */}
                    <div className="w-full flex justify-center sm:w-1/3">
                        <div className="flex flex-wrap gap-4 justify-center">
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
                                            <div className="w-8 h-8 bg-gray-300 rounded"></div>
                                        )}
                                        <span className="text-sm sm:text-md">{social.name || "Social Name"}</span>
                                    </a>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm sm:text-md">No social media links provided</p>
                            )}
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="w-full flex justify-center sm:w-1/3 sm:justify-end">
                        <div className="flex flex-wrap gap-4 justify-center items-center">
                            {footerData.right_info.some(logo => logo?.imgUrl) ? (
                                footerData.right_info.map((logo, index) => (
                                    logo?.imgUrl ? (
                                        <img
                                            key={index}
                                            src={logo.imgUrl}
                                            alt={`Logo ${index + 1}`}
                                            className={`h-${footerData.logosize} w-${footerData.logosize} object-contain`}
                                        />
                                    ) : null
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm sm:text-md">No logos provided</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;