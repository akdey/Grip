import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSureties, useCreateExclusion } from '../features/bills/hooks';
import { Loader } from '../components/ui/Loader';
import { ArrowLeft, Ban, CalendarX, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const Sureties: React.FC = () => {
    const navigate = useNavigate();
    const { data: sureties, isLoading } = useSureties();
    const createExclusion = useCreateExclusion();

    const handleSkip = (sourceId: string) => {
        if (!confirm('Skip this surety for this month?')) return;
        createExclusion.mutate({
            source_transaction_id: sourceId,
            exclusion_type: 'SKIP'
        });
    };

    const handleTerminate = (merchant: string, subCategory: string) => {
        // Clean merchant name if it has suffix
        const cleanMerchant = merchant.replace(' (Auto-detected)', '').trim();
        if (!confirm(`Permanently stop identifying obligations for ${cleanMerchant} (${subCategory})?`)) return;
        createExclusion.mutate({
            merchant_pattern: cleanMerchant,
            subcategory_pattern: subCategory,
            exclusion_type: 'PERMANENT'
        });
    };

    if (isLoading) return <Loader fullPage />;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 pb-24 animate-in fade-in duration-500">
            <header className="flex items-center gap-4 mb-8 sticky top-0 bg-[#050505]/80 backdrop-blur-xl py-4 z-10 border-b border-white/5 -mx-6 px-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">Manage sureties</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Auto-detected Obligations</p>
                </div>
            </header>

            <div className="space-y-4">
                {sureties?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <RefreshCw size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">No auto-detected sureties found.</p>
                    </div>
                )}

                {sureties?.map((surety) => (
                    <div key={surety.id} className="p-5 rounded-[1.5rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] relative overflow-hidden group hover:border-white/20 transition-all duration-300">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            <div className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border
                                    ${surety.status === 'OVERDUE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    surety.status === 'PAID' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        surety.status === 'SKIPPED' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            surety.status === 'COVERED' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                                {surety.status}
                            </div>
                        </div>

                        <div className="pr-20">
                            <h3 className="font-bold text-gray-100 text-lg leading-tight mb-1">{surety.title.replace(' (Auto-detected)', '')}</h3>
                            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">{format(new Date(surety.due_date), 'MMMM do')} • {surety.sub_category}</p>
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                            <div className="font-mono font-medium text-2xl tracking-tighter text-white">
                                ₹{Math.abs(surety.amount).toLocaleString('en-IN')}
                            </div>

                            {surety.source_id && (
                                <button
                                    onClick={() => navigate(`/transactions?highlight=${surety.source_id}`)}
                                    className="text-xs text-cyan-400/80 hover:text-cyan-400 flex items-center gap-1.5 hover:underline decoration-cyan-400/30 underline-offset-4 transition-all"
                                >
                                    Source <ExternalLink size={12} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-white/[0.05]">
                            <button
                                onClick={() => surety.source_id && handleSkip(surety.source_id)}
                                disabled={['SKIPPED', 'PAID', 'COVERED', 'TERMINATED'].includes(surety.status)}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] text-orange-400/80 text-xs font-bold hover:bg-orange-500/10 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-orange-500/20"
                            >
                                <CalendarX size={14} />
                                Skip Month
                            </button>
                            <button
                                onClick={() => handleTerminate(surety.title, surety.sub_category)}
                                disabled={['TERMINATED', 'COVERED'].includes(surety.status)}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] text-red-400/80 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 transition-all border border-transparent hover:border-red-500/20"
                            >
                                <Ban size={14} />
                                Terminate
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sureties;
