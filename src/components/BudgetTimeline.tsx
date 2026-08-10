import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetRequest, SubActivity, AppUser } from '../types';
import { getResponsiblePersonName, getResponsibleUsers } from '../utils';
import { Calendar, User, Clock, CheckCircle2, Maximize2, X } from 'lucide-react';

interface BudgetTimelineProps {
  requests: BudgetRequest[];
  activities?: SubActivity[];
  users?: AppUser[];
  defaultMode?: 'MINI' | 'FULL';
}

const QUARTERS = [
  { id: 'Q1', label: 'ไตรมาส 1', sub: 'ต.ค. - ธ.ค.' },
  { id: 'Q2', label: 'ไตรมาส 2', sub: 'ม.ค. - มี.ค.' },
  { id: 'Q3', label: 'ไตรมาส 3', sub: 'เม.ย. - มิ.ย.' },
  { id: 'Q4', label: 'ไตรมาส 4', sub: 'ก.ค. - ก.ย.' }
];

export default function BudgetTimeline({ requests, activities = [], users = [], defaultMode = 'MINI' }: BudgetTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const format = (val: number) => 
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const formatShort = (val: number) => {
    if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
    return `฿${val}`;
  };

  // Filter only approved or cleared requests
  const activeRequests = requests.filter(r => r.status === 'APPROVED' || r.status === 'CLEARED');

  // Group by project
  const projectsMap = new Map<string, BudgetRequest[]>();
  activeRequests.forEach(req => {
    if (!projectsMap.has(req.projectName)) {
      projectsMap.set(req.projectName, []);
    }
    projectsMap.get(req.projectName)!.push(req);
  });

  if (activeRequests.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm mt-8">
        <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500 font-bold">ยังไม่มีรายการเบิกจ่ายที่อนุมัติ</p>
      </div>
    );
  }

  const renderFullTimeline = () => (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-x-auto custom-scrollbar">
      <div className="min-w-[900px]">
        {/* Timeline Header */}
        <div className="flex border-b border-slate-200 pb-2 mb-4">
          <div className="w-[30%] shrink-0 pr-4 flex items-end">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">โครงการ / กิจกรรม</span>
          </div>
          <div className="w-[70%] flex">
            {QUARTERS.map((q, i) => (
              <div key={i} className="flex-1 text-center border-l border-slate-100 border-dashed relative">
                <span className="block text-sm font-black text-[#1e3a8a]">{q.label}</span>
                <span className="block text-[10px] font-bold text-slate-400 mt-0.5">{q.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="space-y-6 relative">
          {/* Vertical Grid Lines */}
          <div className="absolute inset-y-0 left-[30%] right-0 flex pointer-events-none z-0">
            {QUARTERS.map((_, i) => (
              <div key={i} className="flex-1 border-l border-slate-100 border-dashed" />
            ))}
            <div className="border-l border-slate-100 border-dashed" />
          </div>

          {Array.from(projectsMap.entries()).map(([projectName, projectRequests], pIdx) => (
            <div key={pIdx} className="relative z-10">
              
              {/* Project Header */}
              <div className="flex mb-3 items-center">
                <div className="w-[30%] shrink-0 pr-4">
                  <h4 className="text-sm font-black text-slate-800 leading-tight border-l-4 border-[#1e3a8a] pl-3 py-0.5">{projectName}</h4>
                </div>
                <div className="w-[70%] border-t border-slate-100 border-dashed" />
              </div>

              {/* Activities Rows */}
              <div className="space-y-2 pl-4">
                {projectRequests.map(req => {
                  const isCleared = req.status === 'CLEARED';
                  let displayNames = getResponsiblePersonName(req, users, activities || []);
                  let responsibleUsers = getResponsibleUsers(req, users, activities || []);
                  
                  return (
                    <div key={req.id} className="flex items-center group relative hover:bg-slate-50/50 p-1.5 -mx-1.5 rounded-xl transition-colors">
                      {/* Left Column: Activity Info */}
                      <div className="w-[30%] shrink-0 pr-6 flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {isCleared ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                              <Clock size={12} className="text-indigo-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-700 leading-snug truncate" title={req.activityName}>
                            {req.activityName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                            {responsibleUsers.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5">
                                  {responsibleUsers.slice(0, 3).map((u, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold overflow-hidden z-10 shrink-0">
                                      {u.photoURL ? (
                                        <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                                      ) : (
                                        u.displayName.charAt(0)
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] font-semibold truncate" title={displayNames}>{displayNames}</span>
                              </div>
                            ) : (
                              <>
                                <User size={10} />
                                <span className="text-[10px] font-semibold truncate" title={displayNames}>{displayNames}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Timeline Bars */}
                      <div className="w-[70%] flex relative h-8 items-center">
                        {QUARTERS.map((q, idx) => {
                          const isThisQuarter = req.quarter === q.id;
                          
                          return (
                            <div key={idx} className="flex-1 h-full relative group/bar">
                              {isThisQuarter && (
                                <div className="absolute inset-y-0.5 left-1 right-1">
                                  <div className={`
                                    w-full h-full rounded-full flex items-center px-3 cursor-pointer shadow-sm transition-all hover:scale-[1.02] hover:shadow-md
                                    ${isCleared 
                                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 border border-emerald-500/20' 
                                      : 'bg-gradient-to-r from-[#1e3a8a] to-indigo-500 border border-indigo-500/20'}
                                  `}>
                                    <span className="text-[10px] font-black text-white whitespace-nowrap drop-shadow-sm">
                                      {formatShort(req.amount)}
                                    </span>
                                  </div>
                                  
                                  {/* Tooltip */}
                                  <div className="opacity-0 group-hover/bar:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white p-3 rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-200 w-48 hidden group-hover/bar:block">
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
                                    <p className="font-black text-xs text-white mb-2 pb-2 border-b border-slate-700 leading-snug">{req.activityName}</p>
                                    <div className="space-y-1 text-[10px]">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">สถานะ:</span>
                                        <span className={isCleared ? 'text-emerald-400 font-bold' : 'text-indigo-300 font-bold'}>{isCleared ? 'เคลียร์ยอดแล้ว' : 'กำลังดำเนินการ'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">อนุมัติรวม:</span>
                                        <span className="font-bold">{format(req.amount)}</span>
                                      </div>
                                      {isCleared && req.actualSpent !== undefined && (
                                        <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                                          <span className="text-slate-400">ใช้จริง:</span>
                                          <span className="font-black text-emerald-400">{format(req.actualSpent)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (defaultMode === 'FULL') {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-[#1e3a8a] rounded-xl shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">ไทม์ไลน์การดำเนินกิจกรรม</h3>
            <p className="text-xs font-bold text-slate-400">แผนภาพแสดงระยะเวลาและงบประมาณตลอดปีงบประมาณ</p>
          </div>
        </div>
        {renderFullTimeline()}
      </div>
    );
  }

  return (
    <>
      {/* Mini Calendar Summary Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mt-8 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-[#1e3a8a] rounded-2xl shrink-0 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors cursor-pointer" onClick={() => setIsModalOpen(true)}>
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">ไทม์ไลน์กิจกรรม</h3>
              <p className="text-xs font-bold text-slate-400">ภาพรวมกิจกรรมรายไตรมาส (คลิกเพื่อดูรายละเอียด)</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-bold text-xs transition-colors border border-slate-100 hover:border-indigo-100"
          >
            <Maximize2 size={16} />
            ดูปฏิทินเต็ม
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {QUARTERS.map(q => {
            const count = activeRequests.filter(r => r.quarter === q.id).length;
            return (
              <div 
                key={q.id} 
                onClick={() => setIsModalOpen(true)} 
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${count > 0 ? 'bg-gradient-to-b from-white to-indigo-50/50 border-indigo-100 shadow-sm hover:shadow-md' : 'bg-slate-50/50 border-slate-100 border-dashed hover:border-slate-200'}`}
              >
                <span className={`text-xs font-black uppercase tracking-widest ${count > 0 ? 'text-indigo-500' : 'text-slate-400'}`}>{q.label}</span>
                <span className={`text-2xl font-black mt-1 ${count > 0 ? 'text-[#1e3a8a]' : 'text-slate-300'}`}>
                  {count} <span className="text-xs font-bold">กิจกรรม</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Full Timeline Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-[#1e3a8a] to-indigo-600 text-white rounded-xl shadow-md shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1e3a8a] tracking-tight leading-none mb-1">ไทม์ไลน์การดำเนินกิจกรรม</h3>
                    <p className="text-xs font-bold text-slate-400">แผนภาพแสดงระยะเวลาและงบประมาณตลอดปีงบประมาณ</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body with Scrollable Timeline */}
              <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
                {renderFullTimeline()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
