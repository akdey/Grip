import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Plus,
    Trash2,
    ChevronRight,
    Search,
    ChevronLeft,
    FolderPlus,
    Save
} from 'lucide-react';
import { api } from '../lib/api';
import { useCategories, type TransactionType } from '../features/transactions/categoryHooks';
import type { Category, SubCategory } from '../features/transactions/categoryHooks';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Loader } from '../components/ui/Loader';
import { Button } from '../components/ui/Button';
import { IconSelector } from '../components/ui/IconSelector';
import { ColorSelector } from '../components/ui/ColorSelector';

const Categories: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: categories, isLoading } = useCategories();

    // Explorer State
    const [viewingCategoryId, setViewingCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Creation Mode State
    const [isAddMode, setAddMode] = useState<'NONE' | 'CATEGORY' | 'SUB_CATEGORY'>('NONE');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Store');
    const [newColor, setNewColor] = useState('#6366f1');
    const [newType, setNewType] = useState<TransactionType>('EXPENSE');
    const [newIsSurety, setNewIsSurety] = useState(false);

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
        setNewIcon('Store');
        setNewColor('#6366f1');
        setNewType('EXPENSE');
        setNewIsSurety(false);
    };

    if (isLoading) return <Loader fullPage text="Decrypting Entities" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-24 overflow-x-hidden">
            {/* Full Screen Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => isAddMode !== 'NONE' ? setAddMode('NONE') : viewingCategoryId ? setViewingCategoryId(null) : navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {isAddMode !== 'NONE' ? `Create ${isAddMode === 'CATEGORY' ? 'Entity' : 'Node'}` : viewingCategoryId ? "Sub-Nodes" : "Intelligence Hub"}
                        </h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">
                            {isAddMode !== 'NONE' ? 'Node Deployment' : 'Category Management'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-5 max-w-2xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    {isAddMode === 'NONE' ? (
                        <motion.div
                            key="explorer"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 relative min-h-[70vh]"
                        >
                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                                <input
                                    placeholder="Filter system nodes..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/[0.03] rounded-2xl py-4 pl-12 pr-6 text-white placeholder-gray-800 focus:outline-none border border-white/[0.05] focus:border-white/[0.1] transition-all font-black uppercase text-[10px] tracking-widest"
                                />
                            </div>

                            <div className="space-y-2">
                                {viewingCategoryId ? (
                                    // Sub-category View
                                    (() => {
                                        const cat = categories?.find(c => c.id === viewingCategoryId);
                                        const filteredSubs = cat?.sub_categories.filter(s =>
                                            s.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        );
                                        return (
                                            <div className="space-y-6 animate-enter">
                                                <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] shadow-2xl">
                                                    <div
                                                        className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl border border-white/10 shadow-inner"
                                                        style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}
                                                    >
                                                        <CategoryIcon name={cat?.icon} size={40} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{cat?.name}</h2>
                                                        <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[3px] mt-2">{cat?.sub_categories.length} Nodes assigned</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {filteredSubs?.map((sub: SubCategory) => (
                                                        <div key={sub.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] group/sub hover:bg-white/[0.04] transition-all">
                                                            <div className="flex items-center gap-4">
                                                                <div
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/5"
                                                                    style={{ backgroundColor: `${sub.color || cat?.color}10`, color: sub.color || cat?.color }}
                                                                >
                                                                    <CategoryIcon name={sub.icon} size={18} />
                                                                </div>
                                                                <span className="text-sm text-gray-300 font-bold uppercase tracking-tight">{sub.name}</span>
                                                            </div>
                                                            {sub.user_id && (
                                                                <button
                                                                    onClick={() => deleteSubCategoryMutation.mutate(sub.id)}
                                                                    className="p-2 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover/sub:opacity-100 active:scale-90"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {filteredSubs?.length === 0 && (
                                                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                                                            <div className="w-12 h-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
                                                                <Search size={20} />
                                                            </div>
                                                            <span className="font-black uppercase text-[10px] tracking-[4px]">No nodes found</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    // Categories List
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {categories?.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cat: Category) => (
                                            <div
                                                key={cat.id}
                                                onClick={() => setViewingCategoryId(cat.id)}
                                                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.98]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08]"
                                                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                                    >
                                                        <CategoryIcon name={cat.icon} size={22} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-base font-black text-white uppercase tracking-tight leading-tight">{cat.name}</span>
                                                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1 opacity-70">{cat.sub_categories.length} Sub-nodes</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCategoryId(cat.id);
                                                            setAddMode('SUB_CATEGORY');
                                                            setNewColor(cat.color || '#6366f1');
                                                        }}
                                                        className="p-3 text-cyan-500 bg-cyan-500/5 rounded-xl border border-cyan-500/10 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <FolderPlus size={18} />
                                                    </button>
                                                    {cat.user_id && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(cat.id); }}
                                                            className="p-3 text-gray-800 hover:text-red-500 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <ChevronRight size={18} className="text-gray-900 group-hover:translate-x-1 transition-all ml-2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Floating Action Button */}
                            <div className="fixed bottom-8 right-8 z-50">
                                <button
                                    onClick={() => {
                                        if (viewingCategoryId) {
                                            setSelectedCategoryId(viewingCategoryId);
                                            setAddMode('SUB_CATEGORY');
                                        } else {
                                            setAddMode('CATEGORY');
                                        }
                                        resetForm();
                                    }}
                                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(255,255,255,0.4)] active:scale-90 transition-all"
                                >
                                    <Plus size={32} strokeWidth={3} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="creation"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12 pb-40"
                        >
                            <div className="flex flex-col items-center gap-8 pt-4">
                                <div
                                    className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all duration-300 relative border-[6px] border-white/5"
                                    style={{
                                        backgroundColor: `${newColor}15`,
                                        color: newColor,
                                        boxShadow: `0 40px 80px -20px ${newColor}40`
                                    }}
                                >
                                    <CategoryIcon name={newIcon} size={48} />
                                </div>
                                <div className="flex flex-col items-center gap-2 w-full text-center px-4">
                                    <input
                                        placeholder="Identify..."
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-transparent border-none text-4xl font-black text-center focus:outline-none placeholder-gray-900 uppercase tracking-tighter"
                                        autoFocus
                                    />
                                    {isAddMode === 'SUB_CATEGORY' && (
                                        <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[5px] mt-2">
                                            Parent: {categories?.find(c => c.id === viewingCategoryId || c.id === selectedCategoryId)?.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Logic Archetype */}
                            <div className="space-y-4 px-4">
                                {isAddMode === 'SUB_CATEGORY' && (
                                    <button
                                        onClick={() => setNewIsSurety(!newIsSurety)}
                                        className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all active:scale-[0.98] ${newIsSurety
                                            ? 'bg-amber-500/10 border-amber-500/20'
                                            : 'bg-white/[0.02] border-white/[0.05]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${newIsSurety
                                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                                                : 'bg-white/[0.03] border-white/[0.08] text-gray-500'
                                                }`}>
                                                <Save size={18} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className={`text-sm font-black uppercase tracking-tight ${newIsSurety ? 'text-amber-500' : 'text-gray-500'}`}>Recurring Surety</h4>
                                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">Fixed Monthly Obligation</p>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${newIsSurety ? 'bg-amber-500' : 'bg-white/10'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newIsSurety ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-5">
                                <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[5px] ml-1">Logic Archetype</h4>
                                <div className="flex gap-2 p-1.5 bg-white/[0.02] rounded-3xl border border-white/[0.05] h-14 relative">
                                    {['EXPENSE', 'INCOME', 'INVESTMENT'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setNewType(t as TransactionType)}
                                            className={`
                                                relative flex-1 rounded-[1rem] text-[9px] font-black uppercase tracking-[2px] transition-colors z-10
                                                ${newType === t ? 'text-black font-extrabold' : 'text-gray-600'}
                                            `}
                                        >
                                            {t}
                                            {newType === t && (
                                                <motion.div
                                                    layoutId="full-archetype-indicator"
                                                    className="absolute inset-0 bg-white rounded-[1rem] -z-10 shadow-xl"
                                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[5px] ml-1">Aesthetic Color</h4>
                                <ColorSelector selectedColor={newColor} onSelect={setNewColor} />
                            </div>

                            <div className="space-y-5">
                                <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[5px] ml-1">Symbolic Glyph</h4>
                                <IconSelector selectedIcon={newIcon} onSelect={setNewIcon} color={newColor} />
                            </div>

                            <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#050505]/80 backdrop-blur-2xl border-t border-white/[0.05] z-50">
                                <div className="max-w-xl mx-auto flex gap-4">
                                    <button
                                        onClick={() => setAddMode('NONE')}
                                        className="flex-1 py-5 rounded-[2rem] bg-white/5 text-gray-600 font-black uppercase text-xs tracking-[3px] transition-all active:scale-95 border border-white/[0.05] hover:text-white"
                                    >
                                        Drop
                                    </button>
                                    <Button
                                        onClick={() => {
                                            if (isAddMode === 'CATEGORY') {
                                                createCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor, type: newType });
                                            } else {
                                                createSubCategoryMutation.mutate({
                                                    name: newName,
                                                    icon: newIcon,
                                                    color: newColor,
                                                    type: newType,
                                                    category_id: selectedCategoryId,
                                                    is_surety: newIsSurety
                                                });
                                            }
                                        }}
                                        isLoading={createCategoryMutation.isPending || createSubCategoryMutation.isPending}
                                        className="flex-[2] py-5 rounded-[2rem] bg-white text-black font-black uppercase text-xs tracking-[4px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-none"
                                    >
                                        <Save size={20} />
                                        Commit
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div >
    );
};

export default Categories;
