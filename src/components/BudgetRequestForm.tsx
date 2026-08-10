/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Upload, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Project, SubActivity, AppUser } from '../types';

interface BudgetRequestFormProps {
  projects: Project[];
  activities: SubActivity[];
  users: AppUser[];
  onClose: () => void;
  onSubmit: (data: any, isEdit: boolean) => void;
  remainingBudget: number;
  initialData?: any; // any to avoid importing type, but it should be BudgetRequest
}

export default function BudgetRequestForm({ projects, activities, users, onClose, onSubmit, remainingBudget, initialData }: BudgetRequestFormProps) {
  const eligibleUsers = users.filter(u => u.role === 'APPROVER');
  
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [activityId, setActivityId] = useState(initialData?.activityId || '');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(initialData?.quarter || 'Q1');
  const [monthlyAmounts, setMonthlyAmounts] = useState<Record<string, string>>(
    initialData?.monthlyAmounts 
      ? Object.fromEntries(Object.entries(initialData.monthlyAmounts).map(([k, v]) => [k, (v as number).toLocaleString('en-US')]))
      : {}
  );
  const [responsiblePersonId, setResponsiblePersonId] = useState(
    initialData?.responsiblePersonId || 
    (initialData?.responsiblePerson ? users.find(u => u.displayName === initialData.responsiblePerson)?.uid : undefined) ||
    (eligibleUsers.length === 1 ? eligibleUsers[0].uid : '')
  );
  const [reason, setReason] = useState(initialData?.reason || '');
  const [isDragging, setIsDragging] = useState(false);

  const filteredActivities = activities.filter(a => a.projectId === projectId);
  const selectedActivity = activities.find(a => a.id === activityId);
  const activityRemaining = selectedActivity ? selectedActivity.initialBudget - selectedActivity.spentBudget : 0;

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const actId = e.target.value;
    setActivityId(actId);
    setResponsiblePersonId('');
  };
  const quarterMonths: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string[]> = {
    'Q1': ['ต.ค.-68', 'พ.ย.-68', 'ธ.ค.-68'],
    'Q2': ['ม.ค.-69', 'ก.พ.-69', 'มี.ค.-69'],
    'Q3': ['เม.ย.-69', 'พ.ค.-69', 'มิ.ย.-69'],
    'Q4': ['ก.ค.-69', 'ส.ค.-69', 'ก.ย.-69']
  };

  const handleMonthlyAmountChange = (month: string, val: string) => {
    const rawValue = val.replace(/[^0-9.]/g, '');
    if (!rawValue) {
      setMonthlyAmounts(prev => ({ ...prev, [month]: '' }));
      return;
    }
    const parts = rawValue.split('.');
    parts[0] = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
    setMonthlyAmounts(prev => ({ ...prev, [month]: parts.join('.') }));
  };

  const currentAmount = quarterMonths[quarter].reduce((sum, m) => {
    const val = parseFloat((monthlyAmounts[m] || '0').replace(/,/g, ''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = currentAmount;
    if (numAmount > activityRemaining) return;

    const monthlyNum: Record<string, number> = {};
    quarterMonths[quarter].forEach(m => {
      const val = parseFloat((monthlyAmounts[m] || '0').replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        monthlyNum[m] = val;
      }
    });

    onSubmit({
      ...(initialData ? { id: initialData.id } : {}),
      projectId,
      activityId,
      amount: numAmount,
      monthlyAmounts: monthlyNum,
      quarter,
      responsiblePerson: users.find(u => u.uid === responsiblePersonId)?.displayName || '',
      responsiblePersonId,
      reason,
      status: 'PENDING'
    }, !!initialData);
  };

  const isExceeded = currentAmount > activityRemaining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">{initialData ? 'แก้ไขคำของบประมาณ' : 'สร้างคำของบประมาณใหม่'}</h3>
            <p className="text-sm font-bold text-slate-500 mt-1">{initialData ? 'โปรดตรวจสอบความถูกต้องก่อนบันทึก' : 'กรอกรายละเอียดเพื่อส่งเรื่องรอพิจารณา'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="text-sm font-black text-[#1e3a8a] block ml-1">เลือกโครงการ</label>
              <select 
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setActivityId('');
                }}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all appearance-none"
              >
                <option value="">เลือกโครงการ</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black text-[#1e3a8a] block ml-1">กิจกรรม (Activity)</label>
              <select 
                required
                value={activityId}
                disabled={!projectId}
                onChange={handleActivityChange}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all appearance-none disabled:opacity-50"
              >
                <option value="">เลือกกิจกรรม</option>
                {filteredActivities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(projectId && activityId) && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
              <Info className="text-emerald-600 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">ข้อมูลงบประมาณเบื้องต้น</p>
                <p className="text-sm font-black text-emerald-700 uppercase tracking-tight">
                  งบประมาณคงเหลือในกิจกรรม: <span className="text-[#1e3a8a]">฿ {activityRemaining.toLocaleString()}</span>
                </p>
              </div>
            </div>
          )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-black text-[#1e3a8a] block ml-1">เลือกไตรมาส</label>
                <select 
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all appearance-none"
                >
                  <option value="Q1">ไตรมาส 1 (Q1)</option>
                  <option value="Q2">ไตรมาส 2 (Q2)</option>
                  <option value="Q3">ไตรมาส 3 (Q3)</option>
                  <option value="Q4">ไตรมาส 4 (Q4)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="text-sm font-black text-[#1e3a8a] block mb-4">ระบุจำนวนเงิน</label>
                <div className="space-y-3">
                  {quarterMonths[quarter].map(month => (
                    <div key={month} className="flex items-center gap-4">
                      <div className="w-20 text-xs font-bold text-slate-700">{month}</div>
                      <input 
                        type="text" 
                        placeholder="0.00"
                        value={monthlyAmounts[month] || ''}
                        onChange={(e) => handleMonthlyAmountChange(month, e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">ยอดรวมไตรมาสนี้:</span>
                  <span className={`text-lg font-black ${isExceeded ? 'text-rose-500' : 'text-[#1e3a8a]'}`}>
                    ฿ {currentAmount.toLocaleString()}
                  </span>
                </div>
                {isExceeded && (
                  <p className="text-xs font-bold text-rose-500 mt-2 text-right">ยอดเงินเกินงบประมาณที่เหลืออยู่</p>
                )}
              </div>
            </div>

          <div className="space-y-3">
            <label className="text-sm font-black text-[#1e3a8a] block ml-1">ผู้รับผิดชอบหลัก</label>
            {(!projectId || !activityId) ? (
              <div className="p-4 bg-slate-50 rounded-xl text-xs font-bold text-slate-400 text-center border border-slate-100">โปรดเลือกกิจกรรมก่อน</div>
            ) : (!selectedActivity?.responsiblePersonIds?.length) ? (
              <div className="p-4 bg-slate-50 rounded-xl text-xs font-bold text-slate-400 text-center border border-slate-100">กิจกรรมนี้ยังไม่มีผู้รับผิดชอบ</div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {selectedActivity.responsiblePersonIds.map(uid => {
                  const u = users.find(user => user.uid === uid);
                  if (!u) return null;
                  const isSelected = responsiblePersonId === uid;
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => setResponsiblePersonId(uid)}
                      className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all text-left group aspect-[4/5] ${isSelected ? 'border-[#1e3a8a] shadow-md ring-2 ring-[#1e3a8a]/20' : 'border-slate-100 bg-white hover:border-[#1e3a8a]/40 shadow-sm'}`}
                    >
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-400 flex items-center justify-center font-black text-4xl group-hover:scale-105 transition-transform duration-300">
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent p-3 pt-12 z-10 flex flex-col justify-end">
                        <span className="block text-sm font-black truncate text-white leading-tight">{u.displayName}</span>
                      </div>
                      
                      {isSelected && (
                         <div className="absolute top-2 right-2 z-20 bg-[#1e3a8a] text-white rounded-full p-1 shadow-md">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                      )}
                      {isSelected && <div className="absolute inset-0 bg-[#1e3a8a]/10 z-10 pointer-events-none" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-[#1e3a8a] block ml-1">เหตุผลการขอ (Strategic Justification)</label>
            <textarea 
              rows={4}
              placeholder="ระบุเหตุผลของบประมาณ (ไม่บังคับ)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              ยกเลิก
            </button>
            <button 
              type="submit"
              disabled={isExceeded || !projectId || !activityId || !responsiblePersonId || currentAmount === 0}
              className="flex-[2] px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:from-emerald-400 hover:to-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialData ? 'บันทึกการแก้ไข' : 'ส่งคำขออนุมัติ'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
