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
        <div className="container mx-auto p-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">Barangay Officials</h2>
            {isLoading ? (
                <div className="flex justify-center items-center">
                    <Loader />
                </div>
            ) : teamMembers.length === 0 ? (
                <p className="text-center text-gray-500">No Barangay Officials data.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => (
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
                                <h3 className="text-base md:text-lg font-bold uppercase break-words text-center leading-tight">
                                    {member.name}
                                </h3>
                                <p className="text-sm md:text-base text-gray-700 text-center break-words">
                                    {member.position}
                                </p>

                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BarangayCouncil;
