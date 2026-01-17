import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Plus } from 'lucide-react';

const Tags: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24">
            <header className="p-6 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-all active:scale-90">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Manage Tags</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Organize transactions</p>
                    </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-cyan-400 active:scale-90 transition-all">
                    <Plus size={20} />
                </button>
            </header>

            <div className="p-6 flex flex-col items-center justify-center py-40 opacity-20 space-y-4">
                <Hash size={64} />
                <p className="font-bold uppercase tracking-widest text-sm text-center">No tags created yet</p>
            </div>
        </div>
    );
};

export default Tags;
