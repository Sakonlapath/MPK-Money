import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AppUser, BudgetRequest, SubActivity } from '../types';
import { getResponsiblePersonName, getResponsibleUsers } from '../utils';
import { Calendar, Wallet, CheckCircle, CheckCircle2, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import BudgetTimeline from './BudgetTimeline';

interface ReportSpentPageProps {
  requests: BudgetRequest[];
  allRequests?: BudgetRequest[];
  onReportSpent: (id: string, amount: number, actualSpentMonthly?: Record<string, number>) => void;
  users?: AppUser[];
  activities?: SubActivity[];
}

const MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];

export default function ReportSpentPage({ requests, allRequests, onReportSpent, users = [], activities = [] }: ReportSpentPageProps) {
  const [reportData, setReportData] = useState<Record<string, Record<string, string>>>({});
  const [activeTab, setActiveTab] = useState<'REPORT' | 'CALENDAR'>('REPORT');
  const [expandedReports, setExpandedReports] = useState<string[]>([]);

  useEffect(() => {
    const initial: Record<string, Record<string, string>> = {};
    requests.forEach(req => {
      if (req.status === 'APPROVED') {
        initial[req.id] = {};
        const amounts = req.monthlyAmounts && Object.keys(req.monthlyAmounts).length > 0 
          ? req.monthlyAmounts 
          : { 'ยอดรวม': req.amount };
          
        Object.keys(amounts).forEach(m => {
          initial[req.id][m] = '';
        });
      }
    });
    setReportData(initial);
  }, [requests]);

  const handleInputChange = (reqId: string, month: string, value: string) => {
    const raw = value.replace(/\D/g, '');
    setReportData(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        [month]: raw
      }
    }));
  };

  const handleSubmit = (req: BudgetRequest) => {
    const amounts = req.monthlyAmounts && Object.keys(req.monthlyAmounts).length > 0 
      ? req.monthlyAmounts 
      : { 'ยอดรวม': req.amount };
      
    const monthlyData = reportData[req.id];
    let totalSpent = 0;
    const actualMonthly: Record<string, number> = {};
    
    let isValid = true;
    Object.entries(amounts).forEach(([month, approvedAmt]) => {
      const spent = Number(monthlyData[month]);
      if (isNaN(spent) || spent < 0 || spent > approvedAmt) {
        isValid = false;
      }
      actualMonthly[month] = spent;
      totalSpent += spent;
    });

    if (isValid) {
      onReportSpent(req.id, totalSpent, actualMonthly);
    }
  };

  const format = (val: number) => 
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const pendingReports = requests.filter(r => r.status === 'APPROVED');
  const clearedReports = requests.filter(r => r.status === 'CLEARED');

  // Calendar Stats Calculation
  const calendarStats = MONTHS.map(month => {
    let approved = 0;
    let spent = 0;
    
    requests.forEach(req => {
      if (req.status === 'APPROVED' || req.status === 'CLEARED') {
        if (req.monthlyAmounts?.[month]) {
          approved += req.monthlyAmounts[month];
          if (req.status === 'CLEARED' && req.actualSpentMonthly?.[month]) {
             spent += req.actualSpentMonthly[month];
          }
        }
      }
    });
    return { month, approved, spent, remaining: approved - spent };
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1e3a8a] tracking-tight uppercase">รายงานการใช้จ่าย</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {pendingReports.length} รายการที่รอการเคลียร์ยอด
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('REPORT')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'REPORT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            รายการรายงานยอด
          </button>
          <button 
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'CALENDAR' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            ปฏิทินงบประมาณ
          </button>
        </div>
      </header>

      {activeTab === 'REPORT' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Pending Reports List */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">รายการที่ต้องรายงาน ({pendingReports.length})</h3>
            
            {pendingReports.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4 opacity-50" />
                <p className="text-slate-500 font-bold">ไม่มีรายการที่ต้องรายงานยอด</p>
              </div>
            ) : (
              pendingReports.map(req => {
                const monthlyData = reportData[req.id] || {};
                
                let displayNames = getResponsiblePersonName(req, users, activities);
                let responsibleUsers = getResponsibleUsers(req, users, activities);
                
                const amounts = req.monthlyAmounts && Object.keys(req.monthlyAmounts).length > 0 
                  ? req.monthlyAmounts 
                  : { 'ยอดรวม': req.amount };

                // Validate if button should be enabled
                const isFormValid = Object.entries(amounts).every(([m, a]) => {
                  const s = monthlyData[m];
                  return s !== undefined && s !== '' && Number(s) >= 0 && Number(s) <= a;
                });

                return (
                  <motion.div 
                    layout
                    key={req.id} 
                    className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100/50 hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded">{req.quarter}</span>
                            <span className="text-xs font-bold text-slate-500">{req.projectName}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-800 leading-tight">{req.activityName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">โดย:</span>
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
                                <span className="text-xs font-semibold text-slate-600">{displayNames}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-600">{displayNames}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">ยอดรวมที่อนุมัติ</p>
                          <p className="text-2xl font-black text-emerald-600 tracking-tighter">{format(req.amount)}</p>
                        </div>
                      </div>

                        <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">แจกแจงรายเดือน</p>
                          {Object.entries(amounts).map(([month, amount]) => {
                            const spent = Number(monthlyData[month]) || 0;
                            const diff = amount - spent;

                            return (
                              <div key={month} className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                <div className="md:col-span-4 flex justify-between items-center md:block">
                                  <span className="font-bold text-slate-700">{month}</span>
                                  <p className="text-xs font-black text-slate-400 md:mt-1">อนุมัติ: {format(amount)}</p>
                                </div>
                                <div className="md:col-span-5 relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                  <input 
                                    type="text"
                                    value={monthlyData[month] ? Number(monthlyData[month]).toLocaleString() : ''}
                                    onChange={e => handleInputChange(req.id, month, e.target.value)}
                                    placeholder="ยอดใช้จริง"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                  />
                                </div>
                                <div className="md:col-span-3 text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">เงินเหลือคืน</p>
                                  <p className={`text-sm font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {format(diff)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      <button 
                        onClick={() => handleSubmit(req)}
                        disabled={!isFormValid}
                        className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                      >
                        ยืนยันการรายงานยอด
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Cleared Reports History */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">ประวัติรายการที่เคลียร์ยอดแล้ว ({clearedReports.length})</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="max-h-[800px] overflow-y-auto p-2">
                {clearedReports.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-slate-400 font-bold">ยังไม่มีประวัติการรายงานยอด</p>
                  </div>
                ) : (
                  clearedReports.map(req => {
                    const isExpanded = expandedReports.includes(req.id);
                    return (
                    <div key={req.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors rounded-2xl m-2">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">{req.projectName}</p>
                          <h4 className="text-sm font-black text-slate-800">{req.activityName}</h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded flex items-center gap-1">
                            <CheckCircle size={10} /> เคลียร์แล้ว
                          </span>
                          <button 
                            onClick={() => setExpandedReports(prev => isExpanded ? prev.filter(id => id !== req.id) : [...prev, req.id])}
                            className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm mt-1"
                          >
                            {isExpanded ? (
                              <>ซ่อนรายละเอียด <ChevronUp size={12} strokeWidth={3} /></>
                            ) : (
                              <>ดูรายละเอียด <ChevronDown size={12} strokeWidth={3} /></>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดอนุมัติรวม</p>
                              <p className="font-black text-slate-700">{format(req.amount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ใช้จริงรวม</p>
                              <p className="inline-block bg-indigo-100 text-indigo-700 font-black text-lg px-3 py-1 rounded-lg border border-indigo-200 shadow-inner">
                                {format(req.actualSpent || 0)}
                              </p>
                            </div>
                          </div>

                          {req.actualSpentMonthly && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">สรุปรายเดือน</p>
                              {Object.entries(req.actualSpentMonthly).map(([month, spent]) => {
                                const approved = req.monthlyAmounts?.[month] || 0;
                                return (
                                  <div key={month} className="flex justify-between items-center text-xs px-2 py-1 bg-white rounded-lg border border-slate-50">
                                    <span className="font-bold text-slate-600">{month}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-400">อนุมัติ {format(approved)}</span>
                                      <span className="font-bold text-indigo-500">ใช้จริง {format(spent)}</span>
                                      <span className="font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        คืน {format(approved - spent)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CALENDAR' && (
        <BudgetTimeline requests={allRequests || requests} activities={activities} users={users} defaultMode="FULL" />
      )}
    </div>
  );
}
