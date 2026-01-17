import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Plus,
    Trash2,
    ChevronRight,
    X,
    FolderPlus,
    Save,
    Search
} from 'lucide-react';
import { api } from '../lib/api';
import { useCategories } from '../features/transactions/categoryHooks';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { IconSelector } from '../components/ui/IconSelector';
import { ColorSelector } from '../components/ui/ColorSelector';

const Categories: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: categories, isLoading } = useCategories();

    const [isAddCategoryOpen, setAddCategoryOpen] = useState(false);
    const [isAddSubCategoryOpen, setAddSubCategoryOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Form states
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('⚪');
    const [newColor, setNewColor] = useState('#6366f1');

    const createCategoryMutation = useMutation({
        mutationFn: async (data: { name: string, icon: string, color: string }) => {
            return await api.post('/categories', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddCategoryOpen(false);
            resetForm();
        }
    });

    const createSubCategoryMutation = useMutation({
        mutationFn: async (data: { name: string, icon: string, color: string, category_id: string }) => {
            return await api.post('/categories/sub-categories', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddSubCategoryOpen(false);
            resetForm();
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.delete(`/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const deleteSubCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.delete(`/categories/sub-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const resetForm = () => {
        setNewName('');
        setNewIcon('⚪');
        setNewColor('#6366f1');
        setSelectedCategoryId(null);
    };

    const handleCreateCategory = () => {
        if (!newName) return;
        createCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor });
    };

    const handleCreateSubCategory = () => {
        if (!newName || !selectedCategoryId) return;
        createSubCategoryMutation.mutate({
            name: newName,
            icon: newIcon,
            color: newColor,
            category_id: selectedCategoryId
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col">
            <header className="flex items-center justify-between p-4 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-30 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-semibold tracking-tight">Manage Categories</h1>
                </div>
                <button
                    onClick={() => { resetForm(); setAddCategoryOpen(true); }}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-all font-bold"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    categories?.map(category => (
                        <div key={category.id} className="space-y-3">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-white/5 shadow-inner"
                                        style={{ backgroundColor: `${category.color}20` || 'rgba(255,255,255,0.05)', color: category.color }}
                                    >
                                        {category.icon || '⚪'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-white/90">{category.name}</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                            {category.sub_categories.length} Sub-categories
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {category.user_id && (
                                        <button
                                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setSelectedCategoryId(category.id);
                                            setNewColor(category.color || '#6366f1');
                                            setAddSubCategoryOpen(true);
                                        }}
                                        className="p-2 text-cyan-500 hover:text-cyan-400 transition-colors"
                                    >
                                        <FolderPlus size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pl-12 border-l border-white/5 ml-6">
                                {category.sub_categories.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group/sub">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="text-lg"
                                                style={{ color: sub.color }}
                                            >
                                                {sub.icon || '🔹'}
                                            </span>
                                            <span className="text-sm font-medium text-gray-300">{sub.name}</span>
                                        </div>
                                        {sub.user_id && (
                                            <button
                                                onClick={() => deleteSubCategoryMutation.mutate(sub.id)}
                                                className="p-1.5 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover/sub:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Premium Create/Edit Interface (Drawer) */}
            <Drawer
                isOpen={isAddCategoryOpen}
                onClose={() => setAddCategoryOpen(false)}
                height="h-[92vh]"
            >
                <div className="flex flex-col h-full bg-[#050505]">
                    {/* Header like image 2 */}
                    <div className="flex items-center justify-between p-4 mb-4">
                        <button onClick={() => setAddCategoryOpen(false)} className="text-white">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-lg font-bold">New Category</h2>
                        <div className="w-6" /> {/* Placeholder */}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 space-y-10 pb-20">
                        {/* Interactive Preview */}
                        <div className="flex flex-col items-center gap-6 pt-4">
                            <div
                                className="w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-2xl transition-all duration-300 relative border-4 border-white/5"
                                style={{
                                    backgroundColor: `${newColor}30`,
                                    color: newColor,
                                    boxShadow: `0 20px 40px -10px ${newColor}40`
                                }}
                            >
                                {newIcon}
                            </div>
                            <div className="flex flex-col items-center gap-1 w-full">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Category name</span>
                                <input
                                    placeholder="Enter name..."
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-transparent border-none text-3xl font-bold text-center focus:outline-none placeholder-gray-800"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Color Selection Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Category color</h3>
                            <ColorSelector
                                selectedColor={newColor}
                                onSelect={setNewColor}
                            />
                        </div>

                        {/* Icon Selection Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Category icon</h3>
                            <IconSelector
                                selectedIcon={newIcon}
                                onSelect={setNewIcon}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="p-6 pt-2 sticky bottom-0 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5">
                        <Button
                            onClick={handleCreateCategory}
                            isLoading={createCategoryMutation.isPending}
                            className="w-full py-5 rounded-2xl bg-white text-black font-bold text-lg shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Save Category
                        </Button>
                    </div>
                </div>
            </Drawer>

            {/* Sub-Category Drawer (Similar style) */}
            <Drawer
                isOpen={isAddSubCategoryOpen}
                onClose={() => setAddSubCategoryOpen(false)}
                height="h-[92vh]"
            >
                <div className="flex flex-col h-full bg-[#050505]">
                    <div className="flex items-center justify-between p-4 mb-4">
                        <button onClick={() => setAddSubCategoryOpen(false)} className="text-white">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-lg font-bold">New Sub-Category</h2>
                        <div className="w-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 space-y-10 pb-20">
                        <div className="flex flex-col items-center gap-6 pt-4">
                            <div
                                className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl transition-all duration-300 border-2 border-white/5"
                                style={{
                                    backgroundColor: `${newColor}20`,
                                    color: newColor,
                                    boxShadow: `0 15px 30px -5px ${newColor}30`
                                }}
                            >
                                {newIcon}
                            </div>
                            <div className="flex flex-col items-center gap-1 w-full">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    in {categories?.find(c => c.id === selectedCategoryId)?.name}
                                </span>
                                <input
                                    placeholder="Sub-category name..."
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-transparent border-none text-2xl font-bold text-center focus:outline-none placeholder-gray-800"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Icon color</h3>
                            <ColorSelector
                                selectedColor={newColor}
                                onSelect={setNewColor}
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Pick icon</h3>
                            <IconSelector
                                selectedIcon={newIcon}
                                onSelect={setNewIcon}
                            />
                        </div>
                    </div>

                    <div className="p-6 pt-2 sticky bottom-0 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5">
                        <Button
                            onClick={handleCreateSubCategory}
                            isLoading={createSubCategoryMutation.isPending}
                            className="w-full py-5 rounded-2xl bg-cyan-500 text-black font-bold text-lg shadow-[0_20px_40px_rgba(6,182,212,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 border-none"
                        >
                            <Save size={20} />
                            Create Sub-category
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default Categories;
