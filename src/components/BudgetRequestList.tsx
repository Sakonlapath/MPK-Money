/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle, XCircle, MoreVertical, Edit, Trash2, X, Filter } from 'lucide-react';
import { BudgetRequest, AppUser, SubActivity } from '../types';
import { getResponsiblePersonName } from '../utils';

interface BudgetRequestListProps {
  requests: BudgetRequest[];
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, remark: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReportSpent?: (id: string, amount: number, actualSpentMonthly?: Record<string, number>) => void;
  users?: AppUser[];
  activities?: SubActivity[];
}

const statusMap = {
  PENDING: { label: 'รอตรวจสอบ', color: 'bg-gray-100 text-gray-600', icon: Clock },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
  REJECTED: { label: 'ปฏิเสธ', color: 'bg-rose-50 text-rose-600', icon: XCircle },
  CLEARED: { label: 'เคลียร์ยอดแล้ว', color: 'bg-indigo-50 text-indigo-600', icon: CheckCircle },
};

export default function BudgetRequestList({ requests, isAdmin, onApprove, onReject, onEdit, onCancel, onDelete, onReportSpent, users = [], activities = [] }: BudgetRequestListProps) {
  const [filterProject, setFilterProject] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [reportingRequest, setReportingRequest] = useState<BudgetRequest | null>(null);
  const [reportAmountMonthly, setReportAmountMonthly] = useState<Record<string, string>>({});

  // Find dynamic responsible person name for selectedRequest
  let selectedDisplayName = selectedRequest ? getResponsiblePersonName(selectedRequest, users, activities) : '';

  React.useEffect(() => {
    if (reportingRequest && reportingRequest.monthlyAmounts) {
      const initial: Record<string, string> = {};
      Object.keys(reportingRequest.monthlyAmounts).forEach(m => initial[m] = '');
      setReportAmountMonthly(initial);
    } else {
      setReportAmountMonthly({});
    }
  }, [reportingRequest]);

  const uniqueProjects = Array.from(new Set(requests.map(r => r.projectName)));
  const uniqueActivities = Array.from(new Set(requests.map(r => r.activityName)));

  const filteredRequests = requests.filter(r => 
    (!filterProject || r.projectName === filterProject) &&
    (!filterActivity || r.activityName === filterActivity) &&
    (!filterStatus || r.status === filterStatus)
  );

  const pendingReqs = filteredRequests.filter(r => r.status === 'PENDING');
  const historyReqs = filteredRequests.filter(r => r.status !== 'PENDING');

  const renderTable = (items: BudgetRequest[]) => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <th className="px-6 py-4">ผู้ขออนุมัติ</th>
          <th className="px-6 py-4">โครงการ & กิจกรรม</th>
          <th className="px-6 py-4 text-right">จำนวนเงิน</th>
          <th className="px-6 py-4 text-center">สถานะ</th>
          <th className="px-6 py-4 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              ไม่พบข้อมูล
            </td>
          </tr>
        ) : (
          items.map((req) => {
            const status = statusMap[req.status];
            
            let displayUserName = req.userName;
            let displayUserPhoto = '';
            if (users.length > 0 && req.userId) {
              const found = users.find(u => u.uid === req.userId);
              if (found) {
                displayUserName = found.displayName;
                displayUserPhoto = found.photoURL || '';
              }
            }
            if (displayUserName === 'AJ.Mam') displayUserName = 'นางวิทชรียา ทองผาย';
            
            return (
              <motion.tr 
                layout
                key={req.id} 
                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                onClick={() => setSelectedRequest(req)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[10px] shrink-0 overflow-hidden">
                      {displayUserPhoto ? (
                        <img src={displayUserPhoto} alt={displayUserName} className="w-full h-full object-cover" />
                      ) : (
                        displayUserName.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div className="text-sm font-bold truncate">{displayUserName}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold truncate max-w-[200px]">{req.projectName}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase italic">{req.activityName}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm font-black">฿ {req.amount.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{req.quarter}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded text-[10px] font-black uppercase inline-block ${status.color}`}>
                    {status.label}
                  </span>
                  {req.approverName && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[8px] font-bold overflow-hidden shrink-0">
                        {(() => {
                          const approver = users.find(u => u.displayName === req.approverName);
                          if (approver && approver.photoURL) {
                            return <img src={approver.photoURL} alt={req.approverName} className="w-full h-full object-cover" />;
                          }
                          return req.approverName.split(' ').map(n => n[0]).join('');
                        })()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]">{req.approverName}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    {isAdmin && req.status === 'PENDING' && onApprove && onReject && (
                      <>
                        <button 
                          onClick={() => onApprove(req.id)}
                          className="px-3 py-1 bg-emerald-500 text-white rounded text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors"
                        >
                          อนุมัติ
                        </button>
                        <button 
                          onClick={() => onReject(req.id, 'ไม่อนุมัติ')}
                          className="px-3 py-1 bg-rose-50 text-rose-500 rounded text-[10px] font-black uppercase hover:bg-rose-100 transition-colors"
                        >
                          ปฏิเสธ
                        </button>
                      </>
                    )}
                    
                    {onEdit && req.status !== 'CLEARED' && req.status !== 'REJECTED' && (
                      <button onClick={(e) => { e.stopPropagation(); onEdit(req.id); }} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="แก้ไข">
                        <Edit size={16} />
                      </button>
                    )}
                    {onReportSpent && req.status === 'APPROVED' && (
                      <button onClick={(e) => { e.stopPropagation(); setReportingRequest(req); }} className="px-3 py-1 bg-[#1e3a8a] text-white rounded text-[10px] font-black uppercase hover:bg-blue-800 transition-colors" title="รายงานยอดใช้จริง">
                        รายงานยอด
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={(e) => { e.stopPropagation(); onDelete(req.id); }} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" title="ลบ">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-4">
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'PENDING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          รายการรอตรวจสอบ ({pendingReqs.length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          ประวัติคำขอ ({historyReqs.length})
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white flex-wrap gap-4">
          <h3 className="text-xl font-black uppercase tracking-tight">รายการคำขอล่าสุด</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${showFilters ? 'bg-[#1e3a8a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Filter size={14} /> ตัวกรอง
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">ทุกโครงการ</option>
              {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select 
              value={filterActivity} 
              onChange={e => setFilterActivity(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">ทุกกิจกรรม</option>
              {uniqueActivities.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">ทุกสถานะ</option>
              <option value="PENDING">รอตรวจสอบ</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="REJECTED">ปฏิเสธ</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          {renderTable(activeTab === 'PENDING' ? pendingReqs : historyReqs)}
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {selectedRequest && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">รายละเอียดคำขอ</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">รหัส: {selectedRequest.id}</p>
                  </div>
                  <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4 text-sm font-bold overflow-y-auto">
                  <div className="border-b border-slate-50 pb-3 text-center md:text-left">
                    <p className="text-slate-800 text-base font-black leading-tight mb-1">{selectedRequest.projectName}</p>
                    <p className="text-slate-500 text-sm font-bold">{selectedRequest.activityName}</p>
                  </div>
                  
                  {selectedRequest.status === 'REJECTED' && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                      <XCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm font-black text-rose-700">คำขอนี้ถูกปฏิเสธ / ยกเลิกแล้ว</p>
                        {selectedRequest.remark && <p className="text-xs text-rose-600 mt-1">{selectedRequest.remark}</p>}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col border-b border-slate-50 pb-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">จำนวนเงินรวม</span>
                      <span className="text-lg font-black text-emerald-600">฿ {selectedRequest.amount.toLocaleString()}</span>
                    </div>
                    {selectedRequest.monthlyAmounts && Object.keys(selectedRequest.monthlyAmounts).length > 0 && (
                      <div className="mt-2 pl-4 py-2 bg-slate-50 rounded-lg space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดแยกตามเดือน</p>
                        {Object.entries(selectedRequest.monthlyAmounts).map(([month, val]) => (
                          <div key={month} className="flex justify-between text-xs">
                            <span className="text-slate-500">{month}</span>
                            <span className="font-bold text-slate-700">฿ {val.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedRequest.status === 'CLEARED' && selectedRequest.actualSpent !== undefined && (
                      <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl space-y-3 border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-100 pb-2">สรุปการใช้จ่ายจริง</p>
                        
                        {selectedRequest.actualSpentMonthly && (
                          <div className="space-y-2 pb-2 border-b border-indigo-100/50">
                            {Object.entries(selectedRequest.actualSpentMonthly).map(([month, spent]) => {
                              const approved = selectedRequest.monthlyAmounts?.[month] || 0;
                              return (
                                <div key={month} className="text-xs">
                                  <div className="flex justify-between font-bold text-slate-700">
                                    <span>{month}</span>
                                    <span className="text-indigo-700">ใช้จริง: ฿ {spent.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                                    <span>อนุมัติ ฿ {Number(approved).toLocaleString()}</span>
                                    <span>เหลือคืน ฿ {(Number(approved) - Number(spent)).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500 text-xs">ยอดรวมที่อนุมัติ</span>
                          <span className="font-bold text-slate-700">฿ {selectedRequest.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">ยอดรวมใช้จริง</span>
                          <span className="font-bold text-indigo-700">฿ {selectedRequest.actualSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                          <span className="text-indigo-600 font-bold text-xs">เงินคืนกลับโครงการรวม</span>
                          <span className="font-black text-emerald-600 text-lg">฿ {(selectedRequest.amount - selectedRequest.actualSpent).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 text-xs">เหตุผล</span>
                    <span className="text-right max-w-[200px] truncate">{selectedRequest.reason}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 text-xs">ผู้รับผิดชอบ</span>
                    <span>{selectedDisplayName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400 text-xs">ผู้ขอ</span>
                    <span>{selectedRequest.userName}</span>
                  </div>
                  {selectedRequest.approverName && (
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 text-xs">ผู้อนุมัติ/ปฏิเสธ</span>
                      <span className="font-black text-[#1e3a8a]">{selectedRequest.approverName}</span>
                    </div>
                  )}
                  {selectedRequest.remark && (
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 text-xs">หมายเหตุ</span>
                      <span className="text-right max-w-[200px] text-rose-600">{selectedRequest.remark}</span>
                    </div>
                  )}
                  <div className="flex justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-400 text-xs">สถานะ</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${statusMap[selectedRequest.status].color}`}>
                      {statusMap[selectedRequest.status].label}
                    </span>
                  </div>

                  {/* Audit Trail / History */}
                  {selectedRequest.history && selectedRequest.history.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ประวัติการดำเนินการ</p>
                      <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                        {selectedRequest.history.map((entry, idx) => {
                          const actionLabels: Record<string, { label: string; color: string; dot: string }> = {
                            CREATED: { label: 'สร้างคำขอ', color: 'text-blue-600', dot: 'bg-blue-500' },
                            APPROVED: { label: 'อนุมัติ', color: 'text-emerald-600', dot: 'bg-emerald-500' },
                            REJECTED: { label: 'ปฏิเสธ', color: 'text-rose-600', dot: 'bg-rose-500' },
                            CLEARED: { label: 'เคลียร์ยอด', color: 'text-indigo-600', dot: 'bg-indigo-500' },
                            EDITED: { label: 'แก้ไข', color: 'text-amber-600', dot: 'bg-amber-500' },
                          };
                          const info = actionLabels[entry.action] || { label: entry.action, color: 'text-slate-600', dot: 'bg-slate-400' };
                          return (
                            <div key={idx} className="relative">
                              <div className={`absolute -left-[21px] top-0.5 w-3 h-3 rounded-full ${info.dot} ring-2 ring-white`} />
                              <div>
                                <p className={`text-xs font-black ${info.color}`}>{info.label}</p>
                                <p className="text-[11px] text-slate-600 font-medium">โดย: {entry.userName}</p>
                                <p className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleString('th-TH')}</p>
                                {entry.remark && (
                                  <p className="text-[11px] text-rose-500 mt-0.5 italic">"{entry.remark}"</p>
                                )}
                              </div>
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
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {reportingRequest && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">รายงานยอดใช้จริง</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">คำขอ: {reportingRequest.id}</p>
                  </div>
                  <button onClick={() => setReportingRequest(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">ยอดที่อนุมัติไปรวม:</span>
                      <span className="font-black text-emerald-600">฿ {Number(reportingRequest.amount).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {reportingRequest.monthlyAmounts && Object.entries(reportingRequest.monthlyAmounts).map(([month, amount]) => {
                    const spent = Number(reportAmountMonthly[month]) || 0;
                    return (
                      <div key={month} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700">{month}</span>
                          <span className="text-xs font-black text-slate-400">อนุมัติ: ฿ {Number(amount).toLocaleString()}</span>
                        </div>
                        <div>
                          <input 
                            type="number"
                            value={reportAmountMonthly[month] || ''}
                            onChange={e => setReportAmountMonthly(prev => ({ ...prev, [month]: e.target.value }))}
                            placeholder="ยอดใช้จริง (บาท)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#1e3a8a] transition-colors"
                            max={Number(amount)}
                            min={0}
                          />
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-widest">เงินเหลือส่งคืน</span>
                          <span className={Number(amount) - spent >= 0 ? "text-emerald-500" : "text-rose-500"}>
                            ฿ {(Number(amount) - spent).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  <button 
                    onClick={() => {
                      if (!reportingRequest.monthlyAmounts || !onReportSpent) return;
                      
                      const actualMonthly: Record<string, number> = {};
                      let totalSpent = 0;
                      let isValid = true;
                      
                      Object.entries(reportingRequest.monthlyAmounts).forEach(([month, approvedAmt]) => {
                        const spent = Number(reportAmountMonthly[month]);
                        if (isNaN(spent) || spent < 0 || spent > Number(approvedAmt)) {
                          isValid = false;
                        }
                        actualMonthly[month] = spent;
                        totalSpent += spent;
                      });
                      
                      if (isValid) {
                        onReportSpent(reportingRequest.id, totalSpent, actualMonthly);
                        setReportingRequest(null);
                        setReportAmountMonthly({});
                      }
                    }}
                    disabled={
                      !reportingRequest.monthlyAmounts || 
                      Object.entries(reportingRequest.monthlyAmounts).some(([m, a]) => {
                        const s = reportAmountMonthly[m];
                        return s === undefined || s === '' || Number(s) < 0 || Number(s) > Number(a);
                      })
                    }
                    className="w-full py-4 bg-[#1e3a8a] text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ยืนยันการรายงาน
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showAllModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
              >
                <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">รายการคำขอทั้งหมด ({filteredRequests.length} รายการ)</h3>
                  </div>
                  <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-auto flex-1">
                  {renderTable(filteredRequests)}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
