/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  CheckSquare, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Menu,
  X,
  Users,
  Camera,
  Upload,
  Megaphone,
  Send,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { UserRole, SystemAlert } from '../types';

interface LayoutProps {
  children: ReactNode;
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: UserRole;
    photoURL?: string;
  } | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onUpdateProfile?: (name: string, photoUrl?: string, password?: string, email?: string) => void;
  alerts?: SystemAlert[];
  onDismissAlert?: (id: string) => void;
  onBroadcast?: (message: string) => void;
  pendingApprovalCount?: number;
  clearedReportCount?: number;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  canvas.width = 150;
  canvas.height = 200;
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  
  return canvas.toDataURL('image/jpeg', 0.8);
};

export default function Layout({ children, user, activeTab, onTabChange, onLogout, onUpdateProfile, alerts = [], onDismissAlert, onBroadcast, pendingApprovalCount = 0, clearedReportCount = 0 }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [editProfileName, setEditProfileName] = React.useState(user?.displayName || '');
  const [editProfileEmail, setEditProfileEmail] = React.useState(user?.email || '');
  const [editPhotoURL, setEditPhotoURL] = React.useState(user?.photoURL || '');
  const [editPassword, setEditPassword] = React.useState('');
  
  const [imageSrc, setImageSrc] = React.useState('');
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [lastSeenTime, setLastSeenTime] = React.useState<number>(
    parseInt(localStorage.getItem(`lastSeenTime_${user?.uid}`) || '0')
  );
  
  const handleToggleNotifications = () => {
    if (!showNotifications) {
      const now = Date.now();
      setLastSeenTime(now);
      localStorage.setItem(`lastSeenTime_${user?.uid}`, now.toString());
    }
    setShowNotifications(!showNotifications);
  };
  const [showMegaphone, setShowMegaphone] = React.useState(false);
  const [broadcastMessage, setBroadcastMessage] = React.useState('');

  const handleSendBroadcast = () => {
    if (broadcastMessage.trim() && onBroadcast) {
      onBroadcast(broadcastMessage.trim());
      setBroadcastMessage('');
      setShowMegaphone(false);
      toast.success('ส่งประกาศเรียบร้อยแล้ว');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState(null);

  const handleCropComplete = React.useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveProfile = async () => {
    if (onUpdateProfile && editProfileName.trim() && editProfileEmail.trim()) {
      let finalPhotoUrl = editPhotoURL;
      if (imageSrc && croppedAreaPixels) {
        finalPhotoUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      }
      await onUpdateProfile(editProfileName.trim(), finalPhotoUrl.trim() || undefined, editPassword || undefined, editProfileEmail.trim());
      setShowNotifications(false);
      setShowProfileModal(false);
      setEditPassword('');
    }
  };

  const relevantAlerts = alerts
    .filter(a => a.userId === 'ALL' || a.userId === user?.uid || (user?.role === 'ADMIN' && a.userId === 'ALL_ADMINS'))
    .sort((a, b) => b.timestamp - a.timestamp);
  
  const unreadAlerts = relevantAlerts.filter(a => a.timestamp > lastSeenTime);

  const menuItems = [
    { id: 'dashboard', label: 'หน้าแรก', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'APPROVER', 'USER'] },
    { id: 'approval', label: 'พิจารณาคำขอ', icon: CheckSquare, roles: ['ADMIN', 'MANAGER', 'APPROVER'] },
    { id: 'my-requests', label: 'ขออนุมัติโครงการ', icon: ListTodo, roles: ['ADMIN', 'MANAGER', 'APPROVER', 'USER'] },
    { id: 'report-spent', label: 'รายงานการใช้จ่าย', icon: Wallet, roles: ['ADMIN', 'MANAGER', 'APPROVER', 'USER'] },
    { id: 'admin', label: 'ระบบโครงการ', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
    { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredMenuItems = menuItems.filter(item => user && item.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-[#1e3a8a] shadow-lg shadow-emerald-500/20 shrink-0">
          <LayoutDashboard size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-black text-white tracking-tighter leading-none truncate">ระบบบริหารงาน<br/><span className="text-emerald-400">แผนงานและงบประมาณ</span></h1>
          <p className="text-[10px] text-slate-500 mt-2 tracking-widest font-bold uppercase truncate">รุ่นสำหรับองค์กร</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <div className={`w-2 h-2 rounded-full transition-all shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-transparent'}`} />
                <span className="font-bold uppercase tracking-tight text-sm truncate">
                  {item.label}
                </span>
              </div>
              {item.id === 'approval' && pendingApprovalCount > 0 && (
                <div className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-lg shadow-rose-500/20">
                  {pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}
                </div>
              )}
              {item.id === 'report-spent' && clearedReportCount > 0 && (
                <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-lg shadow-emerald-500/20">
                  {clearedReportCount > 99 ? '99+' : clearedReportCount}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-slate-800 mt-auto flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.displayName?.charAt(0) || 'U'
          )}
        </div>
        <div className="overflow-hidden cursor-pointer" onClick={() => setShowProfileModal(true)} title="คลิกเพื่อแก้ไขโปรไฟล์">
          <p className="text-sm font-bold text-white truncate hover:text-emerald-400 transition-colors">{user?.displayName}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight truncate">
            {user?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : user?.role === 'APPROVER' ? 'ผู้อนุมัติ' : 'ผู้ใช้งาน'}
          </p>
        </div>
        <button 
          onClick={onLogout}
          title="ออกจากระบบ"
          className="ml-auto p-2 text-slate-500 hover:text-rose-400 transition-colors bg-slate-800 rounded-xl shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block w-72 bg-[#1e3a8a] text-white fixed inset-y-0 left-0 z-30 transition-transform duration-300 ${isDesktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        {/* TopBar */}
        <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
                } else {
                  setIsMobileMenuOpen(true);
                }
              }}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
            >
              <Menu size={24} />
            </button>
            <span className={`font-black text-[#1e3a8a] tracking-tighter ${isDesktopSidebarOpen ? 'lg:hidden' : ''}`}>ระบบบริหารงานแผนงานและงบประมาณ</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="ค้นหาข้อมูลทางการเงิน..." 
                className="w-full bg-white border border-slate-100 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-200 transition-all outline-none font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 relative">
            <button 
              onClick={handleToggleNotifications}
              className="relative p-2 text-slate-500 hover:bg-white rounded-full transition-colors"
            >
              <Bell size={20} />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                  {unreadAlerts.length}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="font-black text-sm uppercase tracking-widest text-[#1e3a8a]">แจ้งเตือน ({unreadAlerts.length} ใหม่)</h4>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {relevantAlerts.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 font-bold">ไม่มีการแจ้งเตือน</p>
                    ) : (
                      relevantAlerts.map(alert => (
                        <div key={alert.id} className={`p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group flex items-center gap-3 border-b border-slate-50 last:border-0 ${alert.type === 'INFO' ? 'bg-blue-50/30' : ''}`}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${alert.type === 'DUPLICATE' ? 'bg-rose-500' : alert.type === 'STATUS_UPDATE' ? 'bg-emerald-500' : 'bg-[#1e3a8a]'}`} />
                          <div className="flex-1 w-full min-w-0">
                            {alert.type === 'INFO' ? (
                              <div className="flex gap-3 items-center w-full">
                                <div className="shrink-0">
                                  {alert.announcerPhoto ? (
                                    <img src={alert.announcerPhoto} alt={alert.announcerName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-black text-emerald-700 shadow-sm border border-slate-200">
                                      {alert.announcerName?.charAt(0) || 'A'}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="w-[1px] bg-slate-200 self-stretch mx-0.5"></div>
                                
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <p className="text-xs font-black text-emerald-700 truncate mb-0.5">
                                    {alert.announcerName}
                                  </p>
                                  <p className="text-sm font-black text-slate-900 leading-snug break-words mb-1">
                                    {alert.message}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-bold shrink-0">
                                    {new Date(alert.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{alert.message}</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {new Date(alert.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              </>
                            )}
                          </div>
                          {onDismissAlert && (
                            <button onClick={(e) => { e.stopPropagation(); onDismissAlert(alert.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-lg transition-all text-slate-400 hover:text-rose-500">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
            
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block cursor-pointer group" onClick={() => setShowProfileModal(true)}>
                <p className="text-sm font-black text-[#1e3a8a] leading-tight uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                  {user?.displayName} <span className="text-[10px] text-slate-400 font-normal ml-1">✎</span>
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {user?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : user?.role === 'APPROVER' ? 'ผู้อนุมัติ' : 'ผู้ใช้งาน'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#1e3a8a] text-white z-50 lg:hidden shadow-2xl"
            >
              <div className="absolute top-4 right-4 lg:hidden">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">แก้ไขโปรไฟล์</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ตั้งค่าชื่อที่แสดงในระบบ</p>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อ - สกุล</label>
                    <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">อีเมล</label>
                    <input type="email" value={editProfileEmail} onChange={e => setEditProfileEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">เปลี่ยนรหัสผ่าน (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</label>
                    <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="รหัสผ่านใหม่" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">อัปโหลดรูปโปรไฟล์ใหม่ (สัดส่วน 3:4)</label>
                  {!imageSrc ? (
                    <label className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all text-slate-400 hover:text-emerald-500">
                      <Camera size={24} className="mb-2" />
                      <span className="text-xs font-bold">คลิกเพื่อเลือกรูปภาพ</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  ) : (
                    <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={3 / 4}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                      />
                      <button 
                        onClick={() => setImageSrc('')}
                        className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white z-10"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {!imageSrc && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">หรือใช้ลิงก์รูปภาพ (URL)</label>
                    <input 
                      type="text" 
                      value={editPhotoURL} 
                      onChange={e => setEditPhotoURL(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" 
                      placeholder="https://example.com/photo.jpg" 
                    />
                  </div>
                )}
                <button 
                  onClick={handleSaveProfile} 
                  className="w-full mt-4 bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-xl hover:bg-[#172d6e] transition-all"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="fixed bottom-6 right-6 z-50">
          <AnimatePresence>
            {showMegaphone && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="absolute bottom-16 right-0 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mb-2 origin-bottom-right"
              >
                <div className="p-4 bg-emerald-500 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <Megaphone size={18} />
                    <span className="font-black text-sm uppercase tracking-widest">ประกาศด่วน</span>
                  </div>
                  <button onClick={() => setShowMegaphone(false)} className="hover:bg-emerald-600 p-1 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-3 bg-slate-50/50">
                  <textarea 
                    autoFocus
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="พิมพ์ข้อความที่ต้องการประกาศให้ทุกคนทราบ..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-200 resize-none h-24"
                  />
                  <button onClick={handleSendBroadcast} className="w-full bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-lg hover:bg-[#172d6e] transition-all flex items-center justify-center gap-2">
                    <Send size={14} /> ส่งประกาศ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowMegaphone(!showMegaphone)}
            className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95 border-4 border-white"
          >
            <Megaphone size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
