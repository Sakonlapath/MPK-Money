/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon, DollarSign, PieChart, Briefcase, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Project, SubActivity, BudgetRequest, AppUser } from '../types';
import { getResponsiblePersonName, getResponsibleUsers } from '../utils';
import BudgetTimeline from './BudgetTimeline';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  progress?: number;
  onClick?: () => void;
  clickable?: boolean;
}

const gradients = {
  blue: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
  green: 'from-emerald-400 to-teal-500 shadow-emerald-500/30',
  orange: 'from-amber-400 to-orange-500 shadow-orange-500/30',
  red: 'from-rose-400 to-red-500 shadow-rose-500/30',
  purple: 'from-fuchsia-500 to-purple-600 shadow-purple-500/30',
};

const textColors = {
  blue: 'text-indigo-600',
  green: 'text-teal-600',
  orange: 'text-orange-600',
  red: 'text-rose-600',
  purple: 'text-purple-600',
};

const bgGradients = {
  blue: 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-indigo-500/40',
  green: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-teal-500/40',
  orange: 'bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-orange-500/40',
  red: 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-rose-500/40',
  purple: 'bg-gradient-to-br from-fuchsia-600 to-purple-800 text-white shadow-purple-500/40',
};

export function StatCard({ title, value, subtitle, icon: Icon, color, progress, onClick, clickable }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      className={`${bgGradients[color]} p-7 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden group ${clickable ? 'cursor-pointer ring-4 ring-transparent hover:ring-white/50' : ''}`}
    >
      {/* Ambient background glow for depth */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -right-10 w-64 h-64 bg-white rounded-full blur-3xl pointer-events-none z-0" 
      />

      {/* Glass reflection shimmer effect - triggers ONLY on hover */}
      <div 
        className="absolute top-0 bottom-0 -inset-full w-1/2 z-0 block transform -skew-x-12 -translate-x-[200%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
      />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-3.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg border border-white/20`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest mb-1.5">{title}</p>
        <h4 className="text-3xl font-extrabold tracking-tight text-white">{value}</h4>
        {subtitle && <p className={`text-[10px] font-bold uppercase mt-2 text-white/90`}>{subtitle}</p>}
      </div>

      {progress !== undefined && (
        <div className="mt-6 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">สัดส่วน</span>
            <span className={`text-xs font-bold text-white`}>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden shadow-inner border border-black/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function BudgetOverview({ 
  total, 
  approved,
  allocated,
  unallocated, 
  remaining,
  projects,
  activities,
  requests,
  users
}: { 
  total: number; 
  approved: number;
  allocated: number;
  unallocated: number; 
  remaining: number;
  projects?: Project[];
  activities?: SubActivity[];
  requests?: BudgetRequest[];
  users?: AppUser[];
}) {
  const [showAllocatedModal, setShowAllocatedModal] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<SubActivity | null>(null);

  const format = (val: number) => 
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const totalActualSpent = requests?.filter(r => r.status === 'CLEARED').reduce((sum, r) => sum + (r.actualSpent || 0), 0) || 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="งบประมาณตั้งต้น (ทั้งหมด)" 
          value={format(total)} 
          subtitle="ยอดเงินทุนรวมทั้งหมด"
          icon={DollarSign} 
          color="blue"
        />
        <StatCard 
          title="จัดสรรให้โครงการแล้ว" 
          value={format(allocated)} 
          progress={total > 0 ? Math.round((allocated / total) * 100) : 0}
          icon={Briefcase} 
          color="purple"
          clickable={true}
          onClick={() => setShowAllocatedModal(true)}
          subtitle="คลิกเพื่อดูรายละเอียด"
        />
        <StatCard 
          title="งบประมาณคงเหลือ (หลังหักอนุมัติ)" 
          value={format(remaining)} 
          progress={total > 0 ? Math.round((remaining / total) * 100) : 0}
          icon={DollarSign} 
          color="green"
        />
        <StatCard 
          title="ยอดใช้จ่ายจริงทั้งหมด" 
          value={format(totalActualSpent)} 
          progress={total > 0 ? Math.round((totalActualSpent / total) * 100) : 0}
          icon={DollarSign} 
          color="red"
          subtitle="เฉพาะรายการที่เคลียร์ยอดแล้ว"
        />
      </div>

      <BudgetTimeline requests={requests || []} />

      <AnimatePresence>
        {showAllocatedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-[#1e3a8a]">รายละเอียดงบประมาณที่จัดสรร</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">งบที่จัดสรรให้แต่ละโครงการแล้ว</p>
                </div>
                <button onClick={() => setShowAllocatedModal(false)} className="p-3 bg-white hover:bg-slate-100 rounded-full transition-colors shadow-sm text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                {projects && projects.length > 0 ? (
                  projects.map(p => {
                    const isExpanded = expandedProjects.includes(p.id);
                    const projectActivities = activities?.filter(a => a.projectId === p.id) || [];
                    
                    return (
                      <div key={p.id} className="bg-white rounded-xl p-5 border border-slate-100 flex flex-col gap-4 shadow-sm">
                        <div 
                          className="flex justify-between items-start cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors"
                          onClick={() => setExpandedProjects(prev => isExpanded ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                        >
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{p.name}</h4>
                            <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm">{format(p.totalBudget)}</span>
                            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && projectActivities.length > 0 && (
                          <div className="mt-2 pt-4 border-t border-slate-100 space-y-3 pl-4 border-l-2 border-emerald-100">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">กิจกรรมย่อย</h5>
                            {projectActivities.map(a => (
                              <div 
                                key={a.id} 
                                onClick={() => setSelectedActivity(a)}
                                className="flex justify-between items-center text-sm cursor-pointer hover:bg-emerald-50/50 p-2 -mx-2 rounded-lg transition-colors"
                              >
                                <span className="font-medium text-slate-600 truncate mr-4">{a.name}</span>
                                <div className="text-right whitespace-nowrap">
                                  <span className="font-bold text-slate-700">{format(a.initialBudget - a.spentBudget)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && projectActivities.length === 0 && (
                          <div className="mt-2 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500 italic">ไม่มีกิจกรรมย่อย</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-slate-500 font-medium py-8">ยังไม่มีโครงการที่ได้รับการจัดสรรงบประมาณ</p>
                )}
              </div>
              <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowAllocatedModal(false)}
                  className="px-6 py-3 bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#172d6e] transition-colors shadow-lg"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Details Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-[#1e3a8a]">รายละเอียดกิจกรรม</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedActivity.name}</p>
                </div>
                <button onClick={() => setSelectedActivity(null)} className="p-3 bg-white hover:bg-slate-100 rounded-full transition-colors shadow-sm text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6 flex-1">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center">
                  <span className="font-bold text-emerald-800 text-sm">งบประมาณคงเหลือของกิจกรรมนี้</span>
                  <span className="font-black text-emerald-600 text-xl">{format(selectedActivity.initialBudget - selectedActivity.spentBudget)}</span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">ประวัติการขออนุมัติ</h4>
                  
                  {(() => {
                    const activityRequests = requests?.filter(r => r.activityId === selectedActivity.id) || [];
                    if (activityRequests.length === 0) {
                      return <p className="text-center text-slate-500 font-medium py-4 text-sm">ยังไม่มีประวัติการขออนุมัติในกิจกรรมนี้</p>;
                    }

                    return activityRequests.map(req => {
                      const isCleared = req.status === 'CLEARED';
                      const isApproved = req.status === 'APPROVED';
                      let displayNames = getResponsiblePersonName(req, users || [], activities || []);
                      let responsibleUsers = getResponsibleUsers(req, users || [], activities || []);
                      
                      return (
                        <div key={req.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-sm text-slate-800">{req.quarter}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase ml-2 bg-slate-100 px-2 py-0.5 rounded">
                                {req.status === 'PENDING' ? 'รอตรวจสอบ' : req.status === 'APPROVED' ? 'อนุมัติแล้ว' : req.status === 'REJECTED' ? 'ปฏิเสธ' : 'เคลียร์ยอดแล้ว'}
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500 font-medium">ผู้รับผิดชอบ:</span>
                                {responsibleUsers.length > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-1.5">
                                      {responsibleUsers.slice(0, 3).map((u, i) => (
                                        <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold overflow-hidden z-10 shrink-0">
                                          {u.photoURL ? (
                                            <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                                          ) : (
                                            u.displayName.charAt(0)
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{displayNames}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-700">{displayNames}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-800">{format(req.amount)}</span>
                              {isCleared && req.actualSpent !== undefined && (
                                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">เหลือคืน {format(req.amount - req.actualSpent)}</p>
                              )}
                            </div>
                          </div>

                          {req.monthlyAmounts && Object.keys(req.monthlyAmounts).length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                              {Object.entries(req.monthlyAmounts).map(([month, amount]) => {
                                const actual = req.actualSpentMonthly?.[month];
                                return (
                                  <div key={month} className="flex justify-between text-xs items-center">
                                    <span className="font-bold text-slate-600">{month}</span>
                                    <div className="text-right">
                                      <span className="text-slate-500 mr-2">อนุมัติ: {format(amount)}</span>
                                      {isCleared && actual !== undefined && (
                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">ใช้ไป: {format(actual)}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
