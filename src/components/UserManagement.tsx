import React, { useState } from 'react';
import { AppUser, Project, SubActivity } from '../types';
import { Shield, Plus, X, Camera, PenTool, Check, ChevronDown, ChevronUp, AlertTriangle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface UserManagementProps {
  currentUserId: string;
  users: AppUser[];
  projects: Project[];
  isAdmin: boolean;
  activities?: SubActivity[];
  onAddUser?: (user: any, password?: string) => void;
  onUpdateUser?: (userId: string, data: Partial<AppUser>, activityAuth?: string[]) => void;
  onDeleteUser?: (userId: string) => void;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: any, isSignature = false): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  canvas.width = isSignature ? 400 : 300;
  canvas.height = isSignature ? 200 : 400;
  
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

export default function UserManagement({ currentUserId, users, projects, activities, isAdmin, onAddUser, onUpdateUser, onDeleteUser }: UserManagementProps) {
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ displayName: '', email: '', role: 'USER', password: '', phoneNumber: '' });
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<AppUser | null>(null);
  
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('USER');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserProjects, setEditUserProjects] = useState<string[]>([]);
  const [editUserActivities, setEditUserActivities] = useState<string[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  
  // Image Crop states
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropMode, setCropMode] = useState<'PHOTO' | 'SIGNATURE'>('PHOTO');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'PHOTO' | 'SIGNATURE') => {
    if (e.target.files && e.target.files.length > 0) {
      setCropMode(mode);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddUserSubmit = async () => {
    if (!newUserData.displayName || !newUserData.email || !newUserData.password) {
      toast.error('กรุณากรอกชื่อ, อีเมล และรหัสผ่านเริ่มต้นให้ครบถ้วน');
      return;
    }
    if (onAddUser) {
      let finalPhotoUrl = '';
      if (imageSrc && croppedAreaPixels && cropMode === 'PHOTO') {
        finalPhotoUrl = await getCroppedImg(imageSrc, croppedAreaPixels, false);
      }
      await onAddUser({
        displayName: newUserData.displayName,
        email: newUserData.email,
        role: newUserData.role,
        phoneNumber: newUserData.phoneNumber || '',
        photoURL: finalPhotoUrl || ''
      }, newUserData.password);
    }
    setShowNewUserModal(false);
    setNewUserData({ displayName: '', email: '', role: 'USER', password: '', phoneNumber: '' });
    setImageSrc('');
  };

  const handleEditUserClick = (user: AppUser) => {
    setEditingUser(user);
    setEditUserName(user.displayName);
    setEditUserRole(user.role);
    setEditUserPhone(user.phoneNumber || '');
    setEditUserProjects(user.projectAuth || []);
    const userActs = activities?.filter(a => a.responsiblePersonIds?.includes(user.uid)).map(a => a.id) || [];
    setEditUserActivities(userActs);
    setExpandedProjects([]);
    setImageSrc('');
  };

  const handleSaveEditUser = async () => {
    if (!editingUser || !onUpdateUser) return;
    
    const updateData: Partial<AppUser> = {};

    if (isAdmin) {
      updateData.displayName = editUserName;
      updateData.role = editUserRole as AppUser['role'];
      updateData.projectAuth = editUserProjects;
      updateData.phoneNumber = editUserPhone;
      
      const changes = [];
      if (editUserName !== editingUser.displayName) changes.push('ชื่อ-สกุล');
      if (editUserRole !== editingUser.role) changes.push('สิทธิ์การใช้งาน');
      if (editUserPhone !== (editingUser.phoneNumber || '')) changes.push('เบอร์โทรศัพท์');
      
      if (changes.length > 0 && editingUser.uid !== currentUserId) {
        const alertId = 'alert_' + Date.now();
        await setDoc(doc(db, 'alerts', alertId), {
          id: alertId,
          type: 'INFO',
          message: `ข้อมูลผู้ใช้งานของคุณถูกอัปเดต: ${changes.join(', ')}`,
          timestamp: Date.now(),
          userId: editingUser.uid,
          announcerName: 'ระบบการจัดการ',
          isBroadcast: false
        });
      }
    }

    if (imageSrc && croppedAreaPixels) {
      const finalUrl = await getCroppedImg(imageSrc, croppedAreaPixels, cropMode === 'SIGNATURE');
      if (cropMode === 'PHOTO') {
        updateData.photoURL = finalUrl;
      } else {
        updateData.signatureURL = finalUrl;
      }
    }

    onUpdateUser(editingUser.uid, updateData, editUserActivities);
    setEditingUser(null);
    setImageSrc('');
  };

  const toggleEditUserProject = (projectId: string) => {
    setEditUserProjects(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
    
    const projectActs = activities?.filter(a => a.projectId === projectId).map(a => a.id) || [];
    setEditUserActivities(prev => {
      const isCurrentlyChecked = editUserProjects.includes(projectId);
      if (!isCurrentlyChecked) {
        return Array.from(new Set([...prev, ...projectActs]));
      } else {
        return prev.filter(id => !projectActs.includes(id));
      }
    });
  };

  const toggleEditUserActivity = (activityId: string) => {
    setEditUserActivities(prev => 
      prev.includes(activityId) ? prev.filter(id => id !== activityId) : [...prev, activityId]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'MANAGER': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'APPROVER': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const displayProjects = projects.filter(p => p.id !== 'GLOBAL_BUDGET');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">ผู้ใช้งานในระบบ</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">จัดการรายชื่อพนักงาน สิทธิ์ และลายเซ็น</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNewUserModal(true)} className="flex items-center gap-2 text-sm font-bold text-white bg-[#1e3a8a] px-6 py-3 rounded-xl hover:bg-[#172d6e] transition-all shadow-lg hover:-translate-y-0.5">
            <Plus size={16} /> เพิ่มผู้ใช้ใหม่
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map(user => (
          <div key={user.uid} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all flex flex-col">
            <div className="relative aspect-[3/4] bg-slate-100 w-full overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Camera size={48} className="mb-2 opacity-50" />
                  <span className="text-xs font-medium uppercase tracking-widest">No Photo</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getRoleColor(user.role)} backdrop-blur-md bg-white/90`}>
                  {user.role}
                </span>
              </div>
              {(isAdmin || currentUserId === user.uid) && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => handleEditUserClick(user)} className="p-3 bg-white text-[#1e3a8a] hover:bg-emerald-400 hover:text-white rounded-full shadow-lg transition-colors" title="แก้ไขข้อมูล">
                    <PenTool size={20} />
                  </button>
                  {isAdmin && user.uid !== currentUserId && onDeleteUser && (
                    <button onClick={() => setUserToDelete(user)} className="p-3 bg-white text-rose-500 hover:bg-rose-500 hover:text-white rounded-full shadow-lg transition-colors" title="ลบผู้ใช้">
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-slate-900 truncate">{user.displayName}</h3>
              <p className="text-xs font-medium text-slate-500 truncate">{user.email}</p>
              
              {(user.role === 'APPROVER' || user.role === 'MANAGER') && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <PenTool size={12} /> ลายเซ็นอิเล็กทรอนิกส์
                  </p>
                  {user.signatureURL ? (
                    <img src={user.signatureURL} alt="Signature" className="h-12 object-contain" />
                  ) : (
                    <p className="text-xs italic text-slate-400">ยังไม่ได้ตั้งค่าลายเซ็น</p>
                  )}
                </div>
              )}
              
              {user.role === 'APPROVER' && user.projectAuth && user.projectAuth.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Shield size={12} /> โครงการที่ดูแล ({user.projectAuth.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {user.projectAuth.map(pid => {
                      const proj = projects.find(p => p.id === pid);
                      return proj ? (
                        <span key={pid} className="px-2 py-1 bg-slate-100 rounded text-[10px] font-medium text-slate-600 truncate max-w-[120px]" title={proj.name}>
                          {proj.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {/* NEW USER MODAL */}
        {showNewUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">เพิ่มผู้ใช้งานใหม่</h3>
                </div>
                <button onClick={() => setShowNewUserModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ชื่อ - สกุล</label>
                    <input type="text" value={newUserData.displayName} onChange={e => setNewUserData({...newUserData, displayName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="เช่น สมชาย ใจดี" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">อีเมล</label>
                    <input type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="email@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">เบอร์โทรศัพท์</label>
                    <input type="tel" maxLength={10} value={newUserData.phoneNumber} onChange={e => setNewUserData({...newUserData, phoneNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="08X-XXX-XXXX" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">รหัสผ่านเริ่มต้น</label>
                    <input type="text" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="กำหนดรหัสผ่าน" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">สิทธิ์การใช้งาน</label>
                  <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]">
                    <option value="USER">User (ผู้ขออนุมัติงบ)</option>
                    <option value="APPROVER">Approver (ผู้อนุมัติ)</option>
                    <option value="MANAGER">Manager (หัวหน้าโครงการ)</option>
                    <option value="ADMIN">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">อัปโหลดรูปภาพ (3:4)</label>
                  {!imageSrc ? (
                    <label className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all text-slate-400 hover:text-emerald-500">
                      <Camera size={24} className="mb-2" />
                      <span className="text-xs font-bold">คลิกเพื่อเลือกรูปภาพ</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'PHOTO')} />
                    </label>
                  ) : (
                    <div className="relative h-64 w-full bg-black rounded-xl overflow-hidden">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={3 / 4}
                        onCropChange={setCrop}
                        onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels as any)}
                        onZoomChange={setZoom}
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
                <button onClick={handleAddUserSubmit} className="w-full bg-[#1e3a8a] text-white font-bold text-sm py-4 rounded-xl shadow-xl hover:bg-[#172d6e] transition-all mt-4">
                  สร้างผู้ใช้งาน
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">จัดการข้อมูล: {editingUser.displayName}</h3>
                </div>
                <button onClick={() => { setEditingUser(null); setImageSrc(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                
                {/* Admin-only fields */}
                {isAdmin ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ชื่อ - สกุล</label>
                        <input type="text" value={editUserName} onChange={e => setEditUserName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">เบอร์โทรศัพท์</label>
                        <input type="tel" maxLength={10} value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]" placeholder="08X-XXX-XXXX" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">สิทธิ์การใช้งาน (Role)</label>
                      <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1e3a8a]">
                        <option value="USER">User (ผู้ขออนุมัติงบ)</option>
                        <option value="APPROVER">Approver (ผู้อนุมัติเฉพาะโครงการ)</option>
                        <option value="MANAGER">Manager (หัวหน้าโครงการ)</option>
                        <option value="ADMIN">Admin (ผู้ดูแลระบบ)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => setUserToResetPassword(editingUser)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                      >
                        <Mail size={14} /> ส่งลิงก์รีเซ็ตรหัสผ่านให้ผู้ใช้นี้
                      </button>
                    </div>
                    
                    {editUserRole === 'APPROVER' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">โครงการที่ดูแล (สิทธิ์อนุมัติ)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                          {displayProjects.map(p => (
                            <div key={p.id} className="mb-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                              <div 
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                              >
                                <label 
                                  className="flex items-center gap-3 cursor-pointer flex-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={editUserProjects.includes(p.id)} 
                                    onChange={() => toggleEditUserProject(p.id)} 
                                    className="w-4 h-4 accent-[#1e3a8a] rounded"
                                  />
                                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                                </label>
                                <div className="text-slate-400">
                                  {expandedProjects.includes(p.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>
                              
                              <AnimatePresence>
                                {expandedProjects.includes(p.id) && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-slate-50 border-t border-slate-100"
                                  >
                                    <div className="p-2 space-y-1">
                                      {activities?.filter(a => a.projectId === p.id).map(act => (
                                        <label key={act.id} className="flex items-center gap-3 p-2 ml-4 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer bg-white">
                                          <input 
                                            type="checkbox" 
                                            checked={editUserActivities.includes(act.id)} 
                                            onChange={() => toggleEditUserActivity(act.id)} 
                                            className="w-3 h-3 accent-emerald-500 rounded"
                                          />
                                          <span className="text-xs font-medium text-slate-600">{act.name}</span>
                                        </label>
                                      ))}
                                      {(!activities || activities.filter(a => a.projectId === p.id).length === 0) && (
                                        <p className="text-[10px] text-slate-400 font-medium text-center py-2">ไม่มีกิจกรรมในโครงการนี้</p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                          {displayProjects.length === 0 && (
                            <p className="text-xs font-medium text-slate-400 text-center py-4">ยังไม่มีโครงการในระบบ</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-100">
                    คุณไม่สามารถแก้ไขข้อมูลส่วนบุคคลของผู้อื่นได้ แต่สามารถอัปโหลดลายเซ็นและรูปภาพของตัวเองได้
                  </div>
                )}

                {/* Photo Upload (Available to Admin or Self) */}
                {(isAdmin || currentUserId === editingUser.uid) && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-widest">อัปเดตสื่อ (Media)</h4>
                    
                    <div className="flex gap-4 mb-4">
                      <button onClick={() => setCropMode('PHOTO')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${cropMode === 'PHOTO' ? 'bg-[#1e3a8a] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>รูปโปรไฟล์ (3:4)</button>
                      {(editUserRole === 'APPROVER' || editUserRole === 'MANAGER') && (
                        <button onClick={() => setCropMode('SIGNATURE')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${cropMode === 'SIGNATURE' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>ลายเซ็น (2:1)</button>
                      )}
                    </div>

                    {!imageSrc ? (
                      <label className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50 transition-all text-slate-400 hover:text-[#1e3a8a]">
                        <Camera size={24} className="mb-2" />
                        <span className="text-xs font-bold">คลิกเพื่ออัปโหลด {cropMode === 'PHOTO' ? 'รูปโปรไฟล์' : 'ลายเซ็น'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, cropMode)} />
                      </label>
                    ) : (
                      <div className="relative h-64 w-full bg-slate-900 rounded-xl overflow-hidden">
                        <Cropper
                          image={imageSrc}
                          crop={crop}
                          zoom={zoom}
                          aspect={cropMode === 'PHOTO' ? 3 / 4 : 2 / 1}
                          onCropChange={setCrop}
                          onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels as any)}
                          onZoomChange={setZoom}
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
                )}

                <button onClick={handleSaveEditUser} className="w-full bg-[#1e3a8a] text-white font-bold text-sm py-4 rounded-xl shadow-xl hover:bg-[#172d6e] transition-all">
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบผู้ใช้</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  คุณต้องการลบผู้ใช้ <span className="font-bold text-slate-800">{userToDelete.displayName}</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setUserToDelete(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={() => {
                      if (onDeleteUser) onDeleteUser(userToDelete.uid);
                      setUserToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 bg-rose-500 text-white font-bold text-sm rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                  >
                    ยืนยันการลบ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* PASSWORD RESET CONFIRMATION MODAL */}
        {userToResetPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 text-[#1e3a8a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">ส่งลิงก์รีเซ็ตรหัสผ่าน</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล <br/>
                  <span className="font-bold text-slate-800">{userToResetPassword.email}</span>
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setUserToResetPassword(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await sendPasswordResetEmail(auth, userToResetPassword.email);
                        toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลสำเร็จแล้ว');
                      } catch (err: any) {
                        toast.error('เกิดข้อผิดพลาด: ' + err.message);
                      }
                      setUserToResetPassword(null);
                    }}
                    className="flex-1 px-4 py-3 bg-[#1e3a8a] text-white font-bold text-sm rounded-xl hover:bg-[#172d6e] transition-colors shadow-lg shadow-[#1e3a8a]/30"
                  >
                    ยืนยันการส่ง
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
