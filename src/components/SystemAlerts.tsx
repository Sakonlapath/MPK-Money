/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Bell, Info, X } from 'lucide-react';
import { SystemAlert } from '../types';

interface SystemAlertsProps {
  alerts: SystemAlert[];
  onDismiss: (id: string) => void;
  onBroadcast?: (message: string) => void;
}

const alertStyles = {
  DUPLICATE: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-700',
    icon: AlertCircle,
    label: 'ตรวจพบข้อขัดแย้ง'
  },
  STATUS_UPDATE: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    icon: Bell,
    label: 'เปลี่ยนสถานะ'
  },
  INFO: {
    bg: 'bg-slate-50',
    border: 'border-slate-100',
    text: 'text-slate-700',
    icon: Info,
    label: 'ประกาศระบบ'
  }
};

export default function SystemAlerts({ alerts, onDismiss, onBroadcast }: SystemAlertsProps) {
  const [broadcastText, setBroadcastText] = React.useState('');

  const handleBroadcast = () => {
    if (broadcastText.trim() && onBroadcast) {
      onBroadcast(broadcastText.trim());
      setBroadcastText('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-black text-[10px] text-[#1e3a8a] uppercase tracking-widest flex items-center gap-2">
          <Bell size={16} className="text-emerald-500" />
          รายการแจ้งเตือนอัจฉริยะ
        </h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
          {alerts.length} รายการ
        </span>
      </div>

      {onBroadcast && (
        <div className="mb-6 flex gap-2">
          <input 
            type="text" 
            value={broadcastText} 
            onChange={(e) => setBroadcastText(e.target.value)} 
            placeholder="พิมพ์ประกาศแจ้งเตือนถึงทุกคน..." 
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
          />
          <button 
            onClick={handleBroadcast} 
            className="bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#172d6e] transition-all"
          >
            ประกาศ
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {alerts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 border-2 border-dashed border-slate-50 rounded-3xl flex flex-col items-center justify-center text-center text-slate-300"
          >
            <Bell size={24} className="mb-4 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">ไม่มีรายการแจ้งเตือน</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const style = alertStyles[alert.type];
              const Icon = style.icon;
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${style.bg} ${style.border} border-2 rounded-2xl p-5 relative group transition-all hover:bg-white`}
                >
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-xl bg-white shadow-sm shrink-0 border border-slate-50 ${style.text}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${style.text}`}>
                        {style.label}
                      </p>
                      <p className="text-sm font-black text-[#1e3a8a] uppercase tracking-tight leading-tight">
                        {alert.message}
                      </p>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDismiss(alert.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white transition-all text-slate-300 hover:text-[#1e3a8a] shadow-sm border border-transparent hover:border-slate-100"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
