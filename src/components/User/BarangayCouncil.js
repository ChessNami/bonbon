import React from "react";

const teamMembers = [
    { name: "Lyn Bryan", title: "CEO", image: "https://via.placeholder.com/150" },
    { name: "Lauren Pybus", title: "VP, Growth & Development", image: "https://via.placeholder.com/150" },
    { name: "Raelene Thomas", title: "VP, Finance & Operations", image: "https://via.placeholder.com/150" },
    { name: "Mitchell Fawcett", title: "VP, Strategy", image: "https://via.placeholder.com/150" },
    { name: "Jieun Segal", title: "VP, Sales & Marketing", image: "https://via.placeholder.com/150" },
    { name: "Darren Maher", title: "Creative Director", image: "https://via.placeholder.com/150" },
    { name: "Ben Van Exan", title: "Snr Account Executive", image: "https://via.placeholder.com/150" },
    { name: "John Blown", title: "Founding Partner", image: "https://via.placeholder.com/150" },
    { name: "Chris Breikss", title: "Founding Partner", image: "https://via.placeholder.com/150" },
];

const BarangayCouncil = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <button 
                className="mb-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                onClick={() => window.history.back()} // ✅ This replaces useNavigate()
            >
                ← Back
            </button>
            
            <h2 className="text-3xl font-bold text-center mb-6">Meet the Team</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {teamMembers.map((member, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-md text-center">
                        <img 
                            src={member.image} 
                            alt={member.name} 
                            className="w-24 h-24 mx-auto rounded-full mb-4"
                        />
                        <h3 className="text-lg font-semibold">{member.name}</h3>
                        <p className="text-gray-600">{member.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BarangayCouncil;
