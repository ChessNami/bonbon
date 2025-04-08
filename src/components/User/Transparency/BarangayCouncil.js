// BarangayCouncil.js
import React, { useState, useEffect } from "react";
import { supabase } from '../../../supabaseClient';
import placeholderImage from '../../../img/Placeholder/placeholder.png';
import Loader from '../../Loader';

const BarangayCouncil = () => {
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('barangay_officials')
                .select('*');

            if (error) throw error;

            const membersWithSignedUrls = await Promise.all(
                (data || []).map(async (member) => {
                    if (member.image_url) {
                        const filePath = member.image_url.split('/barangayofficials/')[1] || `public/official_${member.id}.jpg`;
                        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                            .from('barangayofficials')
                            .createSignedUrl(filePath, 3600);

                        if (signedUrlError) {
                            console.error(`Error generating signed URL for ${member.name}:`, signedUrlError);
                            return { ...member, signedImageUrl: placeholderImage };
                        }

                        return { ...member, signedImageUrl: signedUrlData.signedUrl };
                    }
                    return { ...member, signedImageUrl: placeholderImage };
                })
            );

            setTeamMembers(membersWithSignedUrls);
        } catch (error) {
            console.error('Error fetching team members:', error);
            setTeamMembers([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            {isLoading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                    <Loader />
                </div>
            ) : teamMembers.length === 0 ? (
                <p className="text-center text-gray-500 sm:text-lg">No Barangay Officials data.</p>
            ) : (
                <div className="grid gap-4">
                    {/* First row: Only Punong Barangay/Barangay Captain/Barangay Kapitan centered */}
                    <div className="flex justify-center">
                        {teamMembers
                            .filter(member =>
                                member.position === "Punong Barangay" ||
                                member.position === "Barangay Captain" ||
                                member.position === "Barangay Kapitan"
                            )
                            .map((leader) => (
                                <div
                                    key={leader.id}
                                    className="bg-white p-4 rounded-lg shadow-md max-w-sm w-full flex flex-col items-center"
                                >
                                    <div className="w-full aspect-square overflow-hidden mb-4 border border-gray-300 rounded">
                                        <img
                                            src={leader.signedImageUrl || placeholderImage}
                                            alt={leader.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error(`Failed to load image for ${leader.name}:`, leader.signedImageUrl);
                                                e.target.src = placeholderImage;
                                            }}
                                        />
                                    </div>
                                    <div className="w-full text-center">
                                        <hr className="w-3/4 mx-auto border-t border-black mb-2" />
                                        <h3 className="text-base sm:text-lg md:text-xl font-bold uppercase break-words text-center leading-tight">
                                            {leader.name}
                                        </h3>
                                        <p className="text-sm sm:text-base md:text-lg text-gray-700 text-center break-words">
                                            {leader.position}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Remaining members in a responsive grid */}
                    <div className="mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {teamMembers
                                .filter(member =>
                                    member.position !== "Punong Barangay" &&
                                    member.position !== "Barangay Captain" &&
                                    member.position !== "Barangay Kapitan"
                                )
                                .slice(0, 6) // Limit to 6 members
                                .map((member) => (
                                    <div
                                        key={member.id}
                                        className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center"
                                    >
                                        <div className="w-full aspect-square overflow-hidden mb-4 border border-gray-300 rounded">
                                            <img
                                                src={member.signedImageUrl || placeholderImage}
                                                alt={member.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    console.error(`Failed to load image for ${member.name}:`, member.signedImageUrl);
                                                    e.target.src = placeholderImage;
                                                }}
                                            />
                                        </div>
                                        <div className="w-full text-center">
                                            <hr className="w-3/4 mx-auto border-t border-black mb-2" />
                                            <h3 className="text-base sm:text-lg md:text-xl font-bold uppercase break-words text-center leading-tight">
                                                {member.name}
                                            </h3>
                                            <p className="text-sm sm:text-base md:text-lg text-gray-700 text-center break-words">
                                                {member.position}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarangayCouncil;