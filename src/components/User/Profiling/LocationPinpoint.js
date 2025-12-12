// src/components/resident/LocationPinpoint.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import Swal from 'sweetalert2';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_CENTER = [8.508931, 124.649087]; // Barangay Bonbon center

const DraggableMarker = ({ position, setPosition, setHasInteracted }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            setHasInteracted(true);
        },
    });

    return (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    setPosition([pos.lat, pos.lng]);
                    setHasInteracted(true);
                },
            }}
        />
    );
};

const LocationPinpoint = ({ data = {}, onNext, onBack, userId }) => {
    const [position, setPosition] = useState(DEFAULT_CENTER);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [satelliteView, setSatelliteView] = useState(true);
    const [reverseAddress, setReverseAddress] = useState('');
    const [loadingAddress, setLoadingAddress] = useState(false);

    // Track if we've already loaded from Supabase
    const hasLoadedFromSupabase = useRef(false);
    const initialLoadDone = useRef(false);

    // Load from props first (fast UI)
    useEffect(() => {
        if (data.location_lat && data.location_lng && !initialLoadDone.current) {
            const lat = parseFloat(data.location_lat);
            const lng = parseFloat(data.location_lng);
            setPosition([lat, lng]);
            setHasUserInteracted(true);
            initialLoadDone.current = true;
        }
    }, [data]);

    // Load from Supabase ONLY ONCE on mount
    useEffect(() => {
        if (!userId || hasLoadedFromSupabase.current) return;

        const loadSavedLocation = async () => {
            try {
                const { data: residentData, error } = await supabase
                    .from('residents')
                    .select('location_lat, location_lng')
                    .eq('user_id', userId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching location:', error);
                    return;
                }

                if (residentData?.location_lat && residentData?.location_lng) {
                    // Only apply if user hasn't interacted yet
                    if (!hasUserInteracted) {
                        const lat = parseFloat(residentData.location_lat);
                        const lng = parseFloat(residentData.location_lng);
                        setPosition([lat, lng]);
                        setHasUserInteracted(true);
                    }
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                hasLoadedFromSupabase.current = true; // Never fetch again
            }
        };

        loadSavedLocation();
    }, [userId, hasUserInteracted]);

    // Reverse geocoding
    useEffect(() => {
        if (!position) return;

        const fetchAddress = async () => {
            setLoadingAddress(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`
                );
                const data = await response.json();
                setReverseAddress(data?.display_name || 'No address found');
            } catch (err) {
                setReverseAddress('Unable to retrieve address');
            } finally {
                setLoadingAddress(false);
            }
        };

        fetchAddress();
    }, [position]);

    const handleSubmit = async () => {
        const isDefaultPosition =
            Math.abs(position[0] - DEFAULT_CENTER[0]) < 0.000001 &&
            Math.abs(position[1] - DEFAULT_CENTER[1]) < 0.000001;

        if (isDefaultPosition && !hasUserInteracted) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Please move the marker to your exact house location',
                text: 'Click or drag the marker before proceeding.',
                timer: 3000,
                showConfirmButton: false,
            });
            return;
        }

        try {
            const { error } = await supabase
                .from('residents')
                .update({
                    location_lat: position[0].toFixed(6),
                    location_lng: position[1].toFixed(6),
                })
                .eq('user_id', userId);

            if (error) throw error;

            onNext({
                location_lat: position[0].toFixed(6),
                location_lng: position[1].toFixed(6),
            });

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Location saved successfully!',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Save error:', err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Failed to save location',
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Pinpoint Your Residence</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Click on the map or drag the marker to your <strong>exact house location</strong> for accurate verification.
                </p>

                <div className="mb-4 flex items-center space-x-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={satelliteView}
                            onChange={(e) => setSatelliteView(e.target.checked)}
                            className="mr-2"
                        />
                        <span className="text-sm">Satellite View (Recommended)</span>
                    </label>
                </div>

                <div className="h-96 rounded-lg overflow-hidden border border-gray-300 shadow-lg">
                    <MapContainer
                        key={position.join(',')} // Force remount only when position actually changes
                        center={position}
                        zoom={18}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            url={
                                satelliteView
                                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                            }
                            attribution={
                                satelliteView
                                    ? '© Esri'
                                    : '© OpenStreetMap contributors'
                            }
                        />
                        <DraggableMarker
                            position={position}
                            setPosition={setPosition}
                            setHasInteracted={setHasUserInteracted}
                        />
                    </MapContainer>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm"><strong>Current Coordinates:</strong></p>
                    <p className="text-xs font-mono">
                        Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
                    </p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {loadingAddress ? (
                        <p className="text-xs text-blue-700 italic">Loading address...</p>
                    ) : (
                        <p className="text-sm text-blue-800 break-words">
                            {reverseAddress || 'Move marker to see address'}
                        </p>
                    )}
                </div>

                {!hasUserInteracted && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                        Warning: Please move the marker to your exact house location before proceeding.
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3">
                <button
                    onClick={onBack}
                    className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition"
                >
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default LocationPinpoint;