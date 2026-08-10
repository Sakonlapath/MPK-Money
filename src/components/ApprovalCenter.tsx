/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, X, Info, AlertTriangle, User, Trash2, ChevronDown, ChevronUp, Calendar, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetRequest, AppUser } from '../types';

interface ApprovalCenterProps {
  pendingRequests: BudgetRequest[];
  allRequests: BudgetRequest[];
  users?: AppUser[];
  onApprove: (id: string) => void;
  onReject: (id: string, remark: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

export default function ApprovalCenter({ 
  pendingRequests, 
  allRequests, 
  users = [],
  onApprove, 
  onReject,
  onDelete,
  onRevoke,
  onEdit
}: ApprovalCenterProps) {
  const [remark, setRemark] = useState<{ [key: string]: string }>({});
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryReq, setSelectedHistoryReq] = useState<BudgetRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const processedRequests = allRequests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CLEARED');

  const statusColors: Record<string, string> = {
    APPROVED: 'bg-emerald-50 text-emerald-600',
    REJECTED: 'bg-rose-50 text-rose-600',
    CLEARED: 'bg-indigo-50 text-indigo-600',
  };
  const statusLabels: Record<string, string> = {
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ปฏิเสธ',
    CLEARED: 'เคลียร์ยอดแล้ว',
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black tracking-tighter">พิจารณาคำขอ</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">คิวรอการอนุมัติ (Pending Request Queue)</p>
        </div>
        <div className="bg-[#1e3a8a] text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <span className="text-2xl font-black text-emerald-400">{pendingRequests.length}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">รายการ<br/>รอพิจารณา</span>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">ไม่มีคำขอรอพิจารณา</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">คำของบประมาณทั้งหมดถูกดำเนินการแล้ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.map((req) => (
            <motion.div 
              layout
              key={req.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-xl hover:border-emerald-200"
            >
              <div className="p-6 flex-1 flex flex-col gap-5">
                {/* Header: Quarter & Urgent badge */}
                <div className="flex justify-between items-start">
                  <div className="bg-indigo-100 text-indigo-700 text-sm font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Calendar size={16} /> {req.quarter}
                  </div>
                  <div className="bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded flex items-center gap-1 shadow-sm">
                    <AlertTriangle size={12} /> ด่วน
                  </div>
                </div>

                {/* Project & Activity Details */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">โครงการ</span>
                    <h4 className="text-lg font-black text-[#1e3a8a] leading-snug">{req.projectName}</h4>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">กิจกรรม</span>
                    <p className="text-sm font-bold text-slate-700 leading-snug">{req.activityName}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">จำนวนเงินรวม</span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tighter">฿ {req.amount.toLocaleString()}</span>
                </div>

                {/* Monthly Breakdown if exists */}
                {req.monthlyAmounts && Object.keys(req.monthlyAmounts).length > 0 && (
                   <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">แยกตามเดือน</span>
                     {Object.entries(req.monthlyAmounts).map(([month, val]) => (
                       <div key={month} className="flex justify-between text-xs px-1">
                         <span className="text-slate-500 font-bold">{month}</span>
                         <span className="font-black text-[#1e3a8a]">฿ {val.toLocaleString()}</span>
                       </div>
                     ))}
                   </div>
                )}

                {/* Reason */}
                {req.reason && req.reason.trim() !== '' && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 relative">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">เหตุผลของบประมาณ</span>
                    <p className="text-sm text-amber-900 font-semibold leading-relaxed">{req.reason}</p>
                  </div>
                )}

                {/* User Info */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1e3a8a] font-black text-sm shadow-inner border border-slate-200 overflow-hidden shrink-0">
                    {(() => {
                      const user = users.find(u => u.uid === req.userId);
                      if (user && user.photoURL) {
                        return <img src={user.photoURL} alt={req.userName} className="w-full h-full object-cover" />;
                      }
                      return req.userName.split(' ').map(n => n[0]).join('');
                    })()}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">ผู้ขอเบิกงบ</span>
                    <p className="text-sm font-black text-slate-700 leading-none">{req.userName}</p>
                  </div>
                </div>
                {/* Remark Input Removed from here, moved to Reject Modal */}
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                <button 
                  onClick={() => setRejectingId(req.id)}
                  className="flex-1 py-4 bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <X size={18} /> ไม่อนุมัติ
                </button>
                <button 
                  onClick={() => onApprove(req.id)}
                  className="flex-1 py-4 bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} /> อนุมัติ
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Decision History Section */}
      {processedRequests.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-6 py-5 flex justify-between items-center hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Info size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black tracking-tight">ประวัติการพิจารณา</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{processedRequests.length} รายการที่ดำเนินการแล้ว</p>
              </div>
            </div>
            {showHistory ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {processedRequests.sort((a, b) => b.updatedAt - a.updatedAt).map((req) => (
                    <div key={req.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedHistoryReq(req)}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${statusColors[req.status] || 'bg-slate-100 text-slate-600'}`}>
                            {statusLabels[req.status] || req.status}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black truncate">{req.projectName}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{req.activityName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-purple-600">อนุมัติ ฿ {req.amount.toLocaleString()}</span>
                            {req.status === 'CLEARED' && req.actualSpent !== undefined && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-rose-500">ใช้จริง ฿ {req.actualSpent.toLocaleString()}</span>
                                <span className="text-slate-300">•</span>
                                <span className={req.amount - req.actualSpent >= 0 ? "text-emerald-500" : "text-amber-500"}>
                                  คืน ฿ {(req.amount - req.actualSpent).toLocaleString()}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">ผู้ขอ:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                {(() => {
                                  const user = users.find(u => u.uid === req.userId);
                                  if (user && user.photoURL) {
                                    return <img src={user.photoURL} alt={req.userName} className="w-full h-full object-cover" />;
                                  }
                                  return req.userName.charAt(0);
                                })()}
                              </div>
                              <span className="text-xs font-bold text-slate-700">{req.userName}</span>
                            </div>
                          </div>
                          {req.approverName && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-[#1e3a8a]">โดย:</span>
                              <div className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center text-[6px] font-bold overflow-hidden text-[#1e3a8a]">
                                {(() => {
                                  const approver = users.find(u => u.displayName === req.approverName);
                                  if (approver && approver.photoURL) {
                                    return <img src={approver.photoURL} alt={req.approverName} className="w-full h-full object-cover" />;
                                  }
                                  return req.approverName.charAt(0);
                                })()}
                              </div>
                              <span className="text-[10px] font-bold text-[#1e3a8a]">{req.approverName}</span>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(req.updatedAt).toLocaleString('th-TH')}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3 shrink-0">
                        {onEdit && req.status !== 'CLEARED' && req.status !== 'REJECTED' && (
                          <button onClick={(e) => { e.stopPropagation(); onEdit(req.id); }} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="แก้ไข">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        )}
                        {onRevoke && req.status === 'APPROVED' && (
                          <button onClick={(e) => { e.stopPropagation(); onRevoke(req.id); }} className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors" title="ยกเลิกการอนุมัติและดึงเงินคืน">
                            ยกเลิกอนุมัติ
                          </button>
                        )}
                        {onDelete && (req.status === 'REJECTED' || req.status === 'PENDING') && (
                          <button onClick={(e) => { e.stopPropagation(); onDelete(req.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="ลบ">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistoryReq && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
              <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-xl font-black tracking-tight">รายละเอียด</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">รหัส: {selectedHistoryReq.id}</p>
                </div>
                <button onClick={() => setSelectedHistoryReq(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-3 text-sm font-bold overflow-y-auto">
                {selectedHistoryReq.status === 'REJECTED' && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 mb-2">
                    <XCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-black text-rose-700">คำขอนี้ถูกปฏิเสธ / ยกเลิกแล้ว</p>
                      {selectedHistoryReq.remark && <p className="text-xs text-rose-600 mt-1">{selectedHistoryReq.remark}</p>}
                    </div>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs">โครงการ</span><span className="text-right">{selectedHistoryReq.projectName}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs">กิจกรรม</span><span className="text-right">{selectedHistoryReq.activityName}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs">อนุมัติไปรวม</span><span className="font-black text-purple-600">฿ {selectedHistoryReq.amount.toLocaleString()}</span></div>
                {selectedHistoryReq.status === 'CLEARED' && selectedHistoryReq.actualSpent !== undefined && (
                  <>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 text-xs">ใช้จริงรวม</span>
                      <span className="font-black text-rose-600">฿ {selectedHistoryReq.actualSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 text-xs">เหลือคืนกองกลาง</span>
                      <span className={selectedHistoryReq.amount - selectedHistoryReq.actualSpent >= 0 ? "font-black text-emerald-500" : "font-black text-amber-500"}>
                        ฿ {(selectedHistoryReq.amount - selectedHistoryReq.actualSpent).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-b border-slate-50 pb-2 items-center">
                  <span className="text-slate-400 text-xs">ผู้ขอ</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">
                      {(() => {
                        const user = users.find(u => u.uid === selectedHistoryReq.userId);
                        if (user && user.photoURL) {
                          return <img src={user.photoURL} alt={selectedHistoryReq.userName} className="w-full h-full object-cover" />;
                        }
                        return selectedHistoryReq.userName.charAt(0);
                      })()}
                    </div>
                    <span>{selectedHistoryReq.userName}</span>
                  </div>
                </div>
                {selectedHistoryReq.approverName && (
                  <div className="flex justify-between border-b border-slate-50 pb-2 items-center">
                    <span className="text-slate-400 text-xs">ผู้อนุมัติ/ปฏิเสธ</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold overflow-hidden text-[#1e3a8a] shrink-0">
                        {(() => {
                          const approver = users.find(u => u.displayName === selectedHistoryReq.approverName);
                          if (approver && approver.photoURL) {
                            return <img src={approver.photoURL} alt={selectedHistoryReq.approverName} className="w-full h-full object-cover" />;
                          }
                          return selectedHistoryReq.approverName.charAt(0);
                        })()}
                      </div>
                      <span className="font-black text-[#1e3a8a]">{selectedHistoryReq.approverName}</span>
                    </div>
                  </div>
                )}
                {selectedHistoryReq.remark && <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs">หมายเหตุ</span><span className="text-rose-600 text-right max-w-[200px]">{selectedHistoryReq.remark}</span></div>}
                <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 text-xs">สถานะ</span><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${statusColors[selectedHistoryReq.status] || ''}`}>{statusLabels[selectedHistoryReq.status] || selectedHistoryReq.status}</span></div>
                
                {selectedHistoryReq.history && selectedHistoryReq.history.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ประวัติการดำเนินการ</p>
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-3">
                      {selectedHistoryReq.history.map((entry, idx) => {
                        const info: Record<string, { label: string; color: string; dot: string }> = {
                          CREATED: { label: 'สร้างคำขอ', color: 'text-blue-600', dot: 'bg-blue-500' },
                          APPROVED: { label: 'อนุมัติ', color: 'text-emerald-600', dot: 'bg-emerald-500' },
                          REJECTED: { label: 'ปฏิเสธ', color: 'text-rose-600', dot: 'bg-rose-500' },
                          CLEARED: { label: 'เคลียร์ยอด', color: 'text-indigo-600', dot: 'bg-indigo-500' },
                          EDITED: { label: 'แก้ไข', color: 'text-amber-600', dot: 'bg-amber-500' },
                        };
                        const e = info[entry.action] || { label: entry.action, color: 'text-slate-600', dot: 'bg-slate-400' };
                        return (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[21px] top-0.5 w-3 h-3 rounded-full ${e.dot} ring-2 ring-white`} />
                            <p className={`text-xs font-black ${e.color}`}>{e.label}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">โดย:</span>
                              <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold overflow-hidden shrink-0">
                                {(() => {
                                  // For history, entry.userId would be ideal, but we only have userName saved in history in the type.
                                  const historyUser = users.find(u => u.displayName === entry.userName);
                                  if (historyUser && historyUser.photoURL) {
                                    return <img src={historyUser.photoURL} alt={entry.userName} className="w-full h-full object-cover" />;
                                  }
                                  return entry.userName.charAt(0);
                                })()}
                              </div>
                              <span className="text-[11px] text-slate-700 font-semibold">{entry.userName}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleString('th-TH')}</p>
                            {entry.remark && <p className="text-[11px] text-rose-500 italic">"{entry.remark}"</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-rose-100 relative">
              <button 
                onClick={() => {
                  setRejectingId(null);
                  setRemark(prev => ({ ...prev, [rejectingId]: '' }));
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#1e3a8a]">ปฏิเสธคำขอ</h3>
                <p className="text-xs font-bold text-slate-500 mt-1 mb-5">โปรดระบุเหตุผลในการไม่อนุมัติ (ถ้ามี)</p>
                <textarea 
                  placeholder="เช่น งบประมาณส่วนนี้ถูกใช้ไปแล้ว..."
                  value={remark[rejectingId] || ''}
                  onChange={(e) => setRemark(prev => ({ ...prev, [rejectingId]: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none h-24 mb-6"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setRejectingId(null);
                      setRemark(prev => ({ ...prev, [rejectingId]: '' }));
                    }}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={() => {
                      onReject(rejectingId, remark[rejectingId] || 'ไม่อนุมัติ');
                      setRejectingId(null);
                      setRemark(prev => ({ ...prev, [rejectingId]: '' }));
                    }}
                    className="flex-1 py-3 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/30"
                  >
                    ยืนยันไม่อนุมัติ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
