import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Receipt,
    LayoutGrid,
    Hash,
    Smartphone,
    Calendar,
    Filter,
    ArrowLeft,
    Plus,
    Save,
    Trash2,
    ChevronRight,
    FolderPlus,
    CircleUserRound
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { Drawer } from '../components/ui/Drawer';
import { useCategories } from '../features/transactions/categoryHooks';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Button } from '../components/ui/Button';
import { IconSelector } from '../components/ui/IconSelector';
import { ColorSelector } from '../components/ui/ColorSelector';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loader } from '../components/ui/Loader';

const FEATURE_CARDS = [
    { id: 'transactions', label: 'History', icon: Receipt, path: '/transactions', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, action: 'OPEN_CATEGORIES', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { id: 'tags', label: 'Hash Tags', icon: Hash, path: '/tags', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
];

const More: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: categories, isLoading } = useCategories();
    const user = useAuthStore((state) => state.user);

    const userName = user?.email?.split('@')[0] || 'Infiltrator';

    // UI State
    const [isCategoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
    const [isAddMode, setAddMode] = useState<'NONE' | 'CATEGORY' | 'SUB_CATEGORY'>('NONE');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Utensils');
    const [newColor, setNewColor] = useState('#6366f1');

    const createCategoryMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/categories', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddMode('NONE');
            resetForm();
        }
    });

    const createSubCategoryMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/categories/sub-categories', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddMode('NONE');
            resetForm();
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/categories/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
    });

    const deleteSubCategoryMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/categories/sub-categories/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
    });

    const resetForm = () => {
        setNewName('');
        setNewIcon('Utensils');
        setNewColor('#6366f1');
    };

    const handleFeatureClick = (card: any) => {
        if (card.action === 'OPEN_CATEGORIES') {
            setCategoryDrawerOpen(true);
        } else if (card.path) {
            navigate(card.path);
        }
    };

    if (isLoading) return <Loader fullPage text="Decrypting Hub" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-20 overflow-x-hidden">
            {/* Minimal Header */}
            <header className="px-6 py-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center p-1 shadow-2xl">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                            <CircleUserRound size={22} className="text-gray-500" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight uppercase">{userName}</h2>
                        <p className="text-[9px] text-gray-600 tracking-[3px] uppercase font-bold mt-1">Intelligence Hub</p>
                    </div>
                </div>
            </header>

            <div className="px-6 space-y-8 animate-enter">
                {/* Feature Grid - Compact & Liquid */}
                <div className="grid grid-cols-2 gap-3">
                    {FEATURE_CARDS.map((card) => (
                        <motion.button
                            key={card.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleFeatureClick(card)}
                            className="flex flex-row items-center gap-4 p-4 rounded-[1.8rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all text-left group"
                        >
                            <div className={`w-10 h-10 rounded-xl ${card.bgColor} ${card.color} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0`}>
                                <card.icon size={18} />
                            </div>
                            <span className="text-sm font-black text-gray-400 tracking-tight uppercase whitespace-nowrap">{card.label}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Smart Views Section */}
                <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[4px] ml-1">Visualization</h3>
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/transactions?view=day')}
                            className="w-full flex items-center justify-between p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/[0.05] group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-[1rem] bg-orange-500/10 text-orange-400/80 flex items-center justify-center shadow-inner">
                                    <Smartphone size={18} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-white/90 text-sm uppercase tracking-tight">Today</span>
                                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-0.5">Instant activity</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-800 transition-transform group-hover:translate-x-1" />
                        </button>

                        <button
                            onClick={() => navigate('/transactions?view=month')}
                            className="w-full flex items-center justify-between p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/[0.05] group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-[1rem] bg-cyan-500/10 text-cyan-400/80 flex items-center justify-center shadow-inner">
                                    <Calendar size={18} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-white/90 text-sm uppercase tracking-tight">Monthly</span>
                                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-0.5">Calendar matrix</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-800 transition-transform group-hover:translate-x-1" />
                        </button>

                        <button
                            onClick={() => navigate('/transactions?view=custom')}
                            className="w-full flex items-center justify-between p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/[0.05] group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-[1rem] bg-purple-500/10 text-purple-400/80 flex items-center justify-center shadow-inner">
                                    <Filter size={18} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-white/90 text-sm uppercase tracking-tight">Search</span>
                                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-0.5">Custom filters</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-800 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Discovery Drawer */}
            <Drawer
                isOpen={isCategoryDrawerOpen}
                onClose={() => { setCategoryDrawerOpen(false); setAddMode('NONE'); }}
                title={isAddMode === 'NONE' ? "Categories" : "Create Node"}
            >
                <div className="flex flex-col h-full bg-[#050505]">
                    {isAddMode === 'NONE' ? (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto space-y-6 pt-2 pb-14 no-scrollbar px-1">
                                {categories?.map(cat => (
                                    <div key={cat.id} className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-[1.5rem] hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.05]">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/[0.08]"
                                                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                                >
                                                    <CategoryIcon name={cat.icon} size={22} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-white/90 tracking-tight uppercase leading-tight">{cat.name}</span>
                                                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-1">{cat.sub_categories.length} Nodes</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => { setSelectedCategoryId(cat.id); setAddMode('SUB_CATEGORY'); setNewColor(cat.color || '#6366f1'); }}
                                                    className="p-3 text-cyan-500 bg-cyan-500/5 rounded-xl border border-cyan-500/10 active:scale-90 transition-all"
                                                >
                                                    <FolderPlus size={16} />
                                                </button>
                                                {cat.user_id && (
                                                    <button
                                                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                                        className="p-3 text-gray-800 hover:text-red-500 transition-all active:scale-90"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5 pl-12 border-l border-white/[0.05] ml-6">
                                            {cat.sub_categories.map(sub => (
                                                <div key={sub.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.015] border border-white/[0.03] group/sub">
                                                    <div className="flex items-center gap-3">
                                                        <CategoryIcon name={sub.icon} size={16} color={sub.color || cat.color} />
                                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-tight line-clamp-1">{sub.name}</span>
                                                    </div>
                                                    {sub.user_id && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteSubCategoryMutation.mutate(sub.id); }}
                                                            className="opacity-0 group-hover/sub:opacity-100 p-2 text-gray-800 hover:text-red-500 transition-all active:scale-90"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 pt-8 sticky bottom-0 bg-[#050505]/80 backdrop-blur-3xl border-t border-white/[0.05]">
                                <Button
                                    onClick={() => { setAddMode('CATEGORY'); resetForm(); }}
                                    className="w-full py-5 rounded-[2.2rem] bg-white text-black font-black text-base uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    New Entity
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-12 pb-10">
                            <div className="flex flex-col items-center gap-6 pt-6">
                                <div
                                    className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative border-[6px] border-[#0a0a0a] ring-1 ring-white/10"
                                    style={{
                                        backgroundColor: `${newColor}15`,
                                        color: newColor,
                                        boxShadow: `0 30px 60px -15px ${newColor}30`
                                    }}
                                >
                                    <CategoryIcon name={newIcon} size={42} />
                                </div>
                                <div className="flex flex-col items-center gap-1 w-full text-center px-4">
                                    <input
                                        placeholder="Identify..."
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-transparent border-none text-3xl font-black text-center focus:outline-none placeholder-gray-900 uppercase tracking-tighter"
                                        autoFocus
                                    />
                                    {isAddMode === 'SUB_CATEGORY' && (
                                        <p className="text-[8px] text-gray-700 font-black uppercase tracking-[5px] mt-2">
                                            Parent: {categories?.find(c => c.id === selectedCategoryId)?.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 px-2">
                                <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[4px] ml-1">Fluid Color</h4>
                                <ColorSelector selectedColor={newColor} onSelect={setNewColor} />
                            </div>

                            <div className="space-y-4 px-2">
                                <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[4px] ml-1">Symbolic Glyph</h4>
                                <IconSelector selectedIcon={newIcon} onSelect={setNewIcon} color={newColor} />
                            </div>

                            <div className="mt-auto items-end pt-10 sticky bottom-0 bg-[#050505] pb-10 border-t border-white/[0.05]">
                                <div className="flex gap-4 px-2">
                                    <button
                                        onClick={() => setAddMode('NONE')}
                                        className="flex-1 py-5 rounded-[1.8rem] bg-white/5 text-gray-600 font-black uppercase text-xs tracking-widest transition-all active:scale-95 border border-white/[0.05] hover:text-white"
                                    >
                                        Drop
                                    </button>
                                    <Button
                                        onClick={() => {
                                            if (isAddMode === 'CATEGORY') {
                                                createCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor });
                                            } else {
                                                createSubCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor, category_id: selectedCategoryId });
                                            }
                                        }}
                                        isLoading={createCategoryMutation.isPending || createSubCategoryMutation.isPending}
                                        className="flex-[2] py-5 rounded-[1.8rem] bg-white text-black font-black uppercase text-xs tracking-[2px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        Commit {isAddMode === 'CATEGORY' ? 'Node' : 'Sub'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Drawer>
        </div>
    );
};

export default More;
