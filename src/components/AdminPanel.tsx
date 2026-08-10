/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit2, Shield, Users, Database, FileDown, X, Camera, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { Project, AppUser, SubActivity } from '../types';

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
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
};

interface AdminPanelProps {
  currentUserId: string;
  projects: Project[];
  activities: SubActivity[];
  users: AppUser[];
  masterBudget: number;
  onUpdateRole: (userId: string, role: any) => void;
  onUpdateBudget: (projectId: string, amount: number) => void;
  onAddProject: (data: any) => void;
  onAddActivity: (data: any) => void;
  onUpdateMasterBudget: (amount: number) => void;
  onAddProjectWithActivities?: (project: any, activities: any[]) => void;
  onUpdateProjectWithActivities?: (projectId: string, projectData: any, activities: any[]) => void;
  onAddUser?: (user: any, password?: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onUpdateUser?: (userId: string, data: { displayName?: string, role?: string, projectAuth?: string[] }) => void;
  onResetData?: () => void;
}

export default function AdminPanel({ currentUserId, projects, activities, users, masterBudget, onUpdateRole, onUpdateBudget, onAddProject, onAddActivity, onUpdateMasterBudget, onAddProjectWithActivities, onUpdateProjectWithActivities, onAddUser, onDeleteProject, onDeleteUser, onUpdateUser, onResetData }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'export'>('config');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '', totalBudget: '' });
  const [newProjectActivities, setNewProjectActivities] = useState<{name: string, initialBudget: string, responsiblePersonIds?: string[]}[]>([]);
  const [masterBudgetInput, setMasterBudgetInput] = useState('');
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectData, setEditProjectData] = useState({ name: '', totalBudget: '' });
  const [editProjectActivities, setEditProjectActivities] = useState<{id?: string, name: string, initialBudget: string, spentBudget?: number, responsiblePersonIds?: string[]}[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ displayName: '', email: '', role: 'USER', password: '' });
  const [imageSrc, setImageSrc] = useState('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAddUserSubmit = async () => {
    if (!newUserData.displayName || !newUserData.email || !newUserData.password) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    if (onAddUser) {
      let finalPhotoUrl = '';
      if (imageSrc && croppedAreaPixels) {
        finalPhotoUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      }
      onAddUser({
        displayName: newUserData.displayName,
        email: newUserData.email,
        role: newUserData.role,
        ...(finalPhotoUrl ? { photoURL: finalPhotoUrl } : {})
      }, newUserData.password);
      setShowNewUserModal(false);
      setNewUserData({ displayName: '', email: '', role: 'USER', password: '' });
      setImageSrc('');
    }
  };

  const handleNewProjectBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setNewProjectData({...newProjectData, totalBudget: ''});
      return;
    }
    const val = parseInt(rawValue, 10);
    const allocated = projects.reduce((acc, p) => acc + p.totalBudget, 0);
    const availableMaster = masterBudget - allocated;
    
    if (val > availableMaster) {
      setNewProjectData({...newProjectData, totalBudget: availableMaster.toLocaleString('en-US')});
      return;
    }
    setNewProjectData({...newProjectData, totalBudget: val.toLocaleString('en-US')});
  };

  const addActivityToNewProject = () => {
    if (newProjectActivities.length < 10) {
      setNewProjectActivities([...newProjectActivities, { name: '', initialBudget: '' }]);
    }
  };

  const updateNewProjectActivity = (index: number, field: string, value: string) => {
    const updated = [...newProjectActivities];
    if (field === 'initialBudget') {
      const rawValue = value.replace(/[^0-9]/g, '');
      if (rawValue) {
        const val = parseInt(rawValue, 10);
        const projBudget = Number(newProjectData.totalBudget.replace(/,/g, '')) || 0;
        const otherActsSum = newProjectActivities.reduce((acc, a, i) => i !== index ? acc + (Number(a.initialBudget.replace(/,/g, '')) || 0) : acc, 0);
        const availableProj = projBudget - otherActsSum;
        
        if (val > availableProj) {
          updated[index][field] = availableProj.toLocaleString('en-US');
        } else {
          updated[index][field] = val.toLocaleString('en-US');
        }
      } else {
        updated[index][field] = '';
      }
    } else {
      updated[index][field as 'name'] = value;
    }
    setNewProjectActivities(updated);
  };
  
  const removeNewProjectActivity = (index: number) => {
    setNewProjectActivities(newProjectActivities.filter((_, i) => i !== index));
  };

  const addActivityToEditProject = () => {
    if (editProjectActivities.length < 10) {
      setEditProjectActivities([...editProjectActivities, { name: '', initialBudget: '', spentBudget: 0 }]);
    }
  };

  const updateEditProjectActivity = (index: number, field: string, value: string) => {
    const updated = [...editProjectActivities];
    if (field === 'initialBudget') {
      const rawValue = value.replace(/[^0-9]/g, '');
      if (rawValue) {
        const val = parseInt(rawValue, 10);
        const projBudget = Number(editProjectData.totalBudget.replace(/,/g, '')) || 0;
        const otherActsSum = editProjectActivities.reduce((acc, a, i) => i !== index ? acc + (Number(a.initialBudget.replace(/,/g, '')) || 0) : acc, 0);
        const availableProj = projBudget - otherActsSum;
        
        if (val > availableProj) {
          updated[index][field] = availableProj.toLocaleString('en-US');
        } else {
          updated[index][field] = val.toLocaleString('en-US');
        }
      } else {
        updated[index][field] = '';
      }
    } else {
      updated[index][field as 'name'] = value;
    }
    setEditProjectActivities(updated);
  };
  
  const removeEditProjectActivity = (index: number) => {
    setEditProjectActivities(editProjectActivities.filter((_, i) => i !== index));
  };



  const handleAddProject = () => {
    if (!newProjectData.name) {
      toast.error('กรุณาระบุชื่อโครงการ');
      return;
    }
    
    const projBudget = Number(newProjectData.totalBudget.replace(/,/g, '')) || 0;
    const allocated = projects.reduce((acc, p) => acc + p.totalBudget, 0);
    const availableMaster = masterBudget - allocated;
    
    if (projBudget > availableMaster) {
      toast.error('ไม่สามารถระบุงบประมาณโครงการเกินงบประมาณที่ยังไม่จัดสรรได้');
      return;
    }

    let actsBudgetSum = 0;
    const acts = newProjectActivities.map(a => {
      const budget = Number(a.initialBudget.replace(/,/g, '')) || 0;
      actsBudgetSum += budget;
      const res: any = {
        name: a.name,
        initialBudget: budget
      };
      if (a.responsiblePersonIds && a.responsiblePersonIds.length > 0) {
        res.responsiblePersonIds = a.responsiblePersonIds;
      }
      return res;
    });

    if (actsBudgetSum > projBudget) {
      toast.error('ผลรวมงบประมาณกิจกรรมย่อยต้องไม่เกินงบประมาณโครงการ');
      return;
    }

    const proj = {
      name: newProjectData.name,
      description: newProjectData.description,
      totalBudget: projBudget
    };
    
    if (onAddProjectWithActivities) {
      onAddProjectWithActivities(proj, acts);
    } else {
      onAddProject(proj);
    }
    
    setShowNewProjectModal(false);
    setNewProjectData({ name: '', description: '', totalBudget: '' });
    setNewProjectActivities([]);
  };

  const handleUpdateMasterBudget = () => {
    const val = Number(masterBudgetInput.replace(/,/g, ''));
    if (val > 0) {
      onUpdateMasterBudget(val);
      setMasterBudgetInput('');
    }
  };

  const handleMasterBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setMasterBudgetInput('');
      return;
    }
    setMasterBudgetInput(parseInt(rawValue, 10).toLocaleString('en-US'));
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setEditProjectData({
      name: project.name,
      totalBudget: project.totalBudget.toLocaleString('en-US')
    });
    const projActivities = activities.filter(a => a.projectId === project.id).map(a => ({
      id: a.id,
      name: a.name,
      initialBudget: a.initialBudget.toLocaleString('en-US'),
      spentBudget: a.spentBudget,
      responsiblePersonIds: a.responsiblePersonIds
    }));
    setEditProjectActivities(projActivities);
  };

  const handleSaveEditProject = () => {
    if (!editingProject) return;
    if (!editProjectData.name) {
      toast.error('กรุณาระบุชื่อโครงการ');
      return;
    }
    
    const projBudget = Number(editProjectData.totalBudget.replace(/,/g, '')) || 0;
    const allocated = projects.reduce((acc, p) => p.id !== editingProject.id ? acc + p.totalBudget : acc, 0);
    const availableMaster = masterBudget - allocated;
    
    if (projBudget > availableMaster) {
      toast.error('ไม่สามารถระบุงบประมาณโครงการเกินงบประมาณที่ยังไม่จัดสรรได้');
      return;
    }

    let actsBudgetSum = 0;
    const acts = editProjectActivities.map(a => {
      const budget = Number(a.initialBudget.replace(/,/g, '')) || 0;
      actsBudgetSum += budget;
      const res: any = {
        id: a.id,
        name: a.name,
        initialBudget: budget,
        spentBudget: a.spentBudget || 0
      };
      if (a.responsiblePersonIds && a.responsiblePersonIds.length > 0) {
        res.responsiblePersonIds = a.responsiblePersonIds;
      }
      return res;
    });

    if (actsBudgetSum > projBudget) {
      toast.error('ผลรวมงบประมาณกิจกรรมย่อยต้องไม่เกินงบประมาณโครงการ');
      return;
    }

    const projData = {
      name: editProjectData.name,
      totalBudget: projBudget
    };

    if (onUpdateProjectWithActivities) {
      onUpdateProjectWithActivities(editingProject.id, projData, acts);
    } else {
      onUpdateBudget(editingProject.id, projData.totalBudget);
    }
    
    setEditingProject(null);
  };

  const handleEditProjectBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setEditProjectData({ ...editProjectData, totalBudget: '' });
      return;
    }
    const val = parseInt(rawValue, 10);
    const allocated = projects.reduce((acc, p) => p.id !== editingProject?.id ? acc + p.totalBudget : acc, 0);
    const availableMaster = masterBudget - allocated;
    
    if (val > availableMaster) {
      setEditProjectData({ ...editProjectData, totalBudget: availableMaster.toLocaleString('en-US') });
      return;
    }
    setEditProjectData({ ...editProjectData, totalBudget: val.toLocaleString('en-US') });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black tracking-tighter">จัดการระบบ (Admin)</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">System Governance</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('config')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'config' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ตั้งค่าระบบ
          </button>
          <button 
            onClick={() => setActiveSubTab('export')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'export' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            รายงาน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeSubTab === 'config' && (
          <>
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-2 font-black text-[10px] text-[#1e3a8a] uppercase tracking-widest">
                    <Database size={16} className="text-emerald-500" />
                    โครงการในระบบ
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowNewProjectModal(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-[#1e3a8a] px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-[#172d6e] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                      <Plus size={14} /> สร้างโครงการ
                    </button>
                    {users.find(u => u.uid === currentUserId)?.role === 'ADMIN' && onResetData && (
                      <button onClick={onResetData} className="flex items-center gap-2 text-xs font-bold text-white bg-rose-500 px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5" title="รีเซ็ตข้อมูลทั้งหมด">
                        <AlertTriangle size={14} /> รีเซ็ตข้อมูลระบบ
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {projects.map(project => (
                    <div key={project.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 flex justify-between items-center group hover:bg-white hover:border-emerald-200 transition-all">
                      <div>
                        <h4 className="font-black text-[#1e3a8a] uppercase tracking-tight">{project.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {activities.filter(a => a.projectId === project.id).length} กิจกรรมย่อย • ฿ {project.totalBudget.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 transition-all">
                        <button onClick={() => handleEditClick(project)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-white rounded-xl shadow-sm border border-slate-100">
                          <Edit2 size={16} />
                        </button>
                        {onDeleteProject && (
                          <button onClick={() => setProjectToDelete(project)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl shadow-sm border border-slate-100">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 font-black text-[10px] text-[#1e3a8a] uppercase tracking-widest mb-6">
                  <Database size={16} className="text-emerald-500" />
                  งบประมาณรวมทั้งระบบ
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">งบประมาณทั้งหมด (Global Budget)</p>
                    <p className="text-3xl font-black text-[#1e3a8a] tracking-tighter">
                      ฿ {masterBudget.toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">แก้ไขงบประมาณรวม</p>
                    <input 
                      type="text" 
                      value={masterBudgetInput}
                      onChange={handleMasterBudgetChange}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                      placeholder={`฿ ${masterBudget.toLocaleString()}`}
                    />
                    <button onClick={handleUpdateMasterBudget} className="w-full mt-3 bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-[#172d6e] transition-all">
                      บันทึกการเปลี่ยนแปลง
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


        {activeSubTab === 'export' && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-[#1e3a8a] border border-slate-100">
                <FileDown size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Financial Audit</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Export comprehensive budget breakdown</p>
              </div>
              <button className="w-full bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl shadow-xl hover:bg-[#172d6e] transition-all flex items-center justify-center gap-2">
                <FileDown size={18} /> Generate CSV Report
              </button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 font-black text-[10px] text-[#1e3a8a] uppercase tracking-widest">
                <Shield size={16} className="text-emerald-500" />
                Audit Logs
              </div>
              <div className="space-y-4">
                {[
                  { user: 'Sarah Jenkins', action: 'updated master budget', time: 'Today, 10:42 AM' },
                  { user: 'Michael Ross', action: 'approved Req #4092', time: 'Yesterday, 14:15 PM' },
                  { user: 'System', action: 'New project IT Infrastructure added', time: 'Oct 24, 09:00 AM' }
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="w-1.5 h-6 bg-emerald-400 rounded-full shrink-0"></div>
                    <div>
                      <p className="text-xs text-[#1e3a8a] font-bold uppercase tracking-tight">
                        <span className="text-slate-400">{log.user}</span> {log.action}
                      </p>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">แก้ไขโครงการ</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{editingProject.name}</p>
                </div>
                <button onClick={() => setEditingProject(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อโครงการ</label>
                  <input type="text" value={editProjectData.name || ''} onChange={e => setEditProjectData({...editProjectData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" placeholder="ระบุชื่อโครงการ" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">งบประมาณโครงการ (บาท)</label>
                  <input type="text" value={editProjectData.totalBudget || ''} onChange={handleEditProjectBudgetChange} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" placeholder="0" />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">กิจกรรมในโครงการ</label>
                  </div>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {editProjectActivities.map((act, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <input type="text" placeholder="ชื่อกิจกรรม" value={act.name || ''} onChange={e => updateEditProjectActivity(idx, 'name', e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                          <input type="text" placeholder="งบ (บาท)" value={act.initialBudget || ''} onChange={e => updateEditProjectActivity(idx, 'initialBudget', e.target.value)} className="w-24 bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                          <button onClick={() => removeEditProjectActivity(idx)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ผู้รับผิดชอบ (เลือกได้สูงสุด 3 คน)</p>
                          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-100 rounded-lg bg-white">
                            {users.filter(u => u.role === 'APPROVER').map(u => {
                              const isSelected = act.responsiblePersonIds?.includes(u.uid);
                              const isMax = (act.responsiblePersonIds?.length || 0) >= 3;
                              return (
                                <label key={u.uid} className={`flex items-center gap-2 text-[10px] p-1.5 rounded cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'text-[#1e3a8a] font-bold bg-blue-50/50' : 'text-slate-600'}`}>
                                  <input 
                                    type="checkbox"
                                    className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] w-3 h-3"
                                    checked={isSelected || false}
                                    disabled={!isSelected && isMax}
                                    onChange={(e) => {
                                      const updated = [...editProjectActivities];
                                      let ids = act.responsiblePersonIds || [];
                                      if (e.target.checked) {
                                        if (ids.length < 3) ids = [...ids, u.uid];
                                      } else {
                                        ids = ids.filter(id => id !== u.uid);
                                      }
                                      updated[idx].responsiblePersonIds = ids;
                                      setEditProjectActivities(updated);
                                    }}
                                  />
                                  <span className="truncate">{u.displayName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {editProjectActivities.length === 0 && (
                      <p className="text-xs font-bold text-slate-400 text-center py-2">ยังไม่มีกิจกรรมย่อย</p>
                    )}
                    {editProjectActivities.length < 10 && (
                      <button onClick={addActivityToEditProject} className="w-full py-4 mt-2 bg-[#6e2c00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#522000] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6e2c00]/20 active:scale-[0.98]">
                        <Plus size={18} /> เพิ่มกิจกรรมใหม่
                      </button>
                    )}
                  </div>
                </div>

                <button type="button" onClick={handleSaveEditProject} className="w-full mt-4 bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-xl hover:bg-[#172d6e] transition-all">
                  บันทึกการแก้ไข
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showNewProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a8a]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">เพิ่มโครงการใหม่</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">สร้างโครงการและจัดสรรงบประมาณ</p>
                </div>
                <button onClick={() => setShowNewProjectModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อโครงการ</label>
                  <input type="text" value={newProjectData.name || ''} onChange={e => setNewProjectData({...newProjectData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" placeholder="ระบุชื่อโครงการ" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">รายละเอียด</label>
                  <input type="text" value={newProjectData.description || ''} onChange={e => setNewProjectData({...newProjectData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" placeholder="ระบุรายละเอียดคร่าวๆ" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">งบประมาณโครงการ (บาท)</label>
                  <input type="text" value={newProjectData.totalBudget || ''} onChange={handleNewProjectBudgetChange} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" placeholder="0" />
                  <p className="text-[10px] font-bold text-slate-500 mt-2">งบประมาณรวมที่จัดสรรได้: ฿ {(masterBudget - projects.reduce((acc, p) => acc + p.totalBudget, 0)).toLocaleString()}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">กิจกรรมในโครงการ</label>
                  </div>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {newProjectActivities.map((act, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <input type="text" placeholder="ชื่อกิจกรรม" value={act.name || ''} onChange={e => updateNewProjectActivity(idx, 'name', e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                          <input type="text" placeholder="งบ (บาท)" value={act.initialBudget || ''} onChange={e => updateNewProjectActivity(idx, 'initialBudget', e.target.value)} className="w-24 bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e3a8a]" />
                          <button onClick={() => removeNewProjectActivity(idx)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ผู้รับผิดชอบ (เลือกได้สูงสุด 3 คน)</p>
                          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-100 rounded-lg bg-white">
                            {users.filter(u => u.role === 'APPROVER').map(u => {
                              const isSelected = act.responsiblePersonIds?.includes(u.uid);
                              const isMax = (act.responsiblePersonIds?.length || 0) >= 3;
                              return (
                                <label key={u.uid} className={`flex items-center gap-2 text-[10px] p-1.5 rounded cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'text-[#1e3a8a] font-bold bg-blue-50/50' : 'text-slate-600'}`}>
                                  <input 
                                    type="checkbox"
                                    className="rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] w-3 h-3"
                                    checked={isSelected || false}
                                    disabled={!isSelected && isMax}
                                    onChange={(e) => {
                                      const updated = [...newProjectActivities];
                                      let ids = act.responsiblePersonIds || [];
                                      if (e.target.checked) {
                                        if (ids.length < 3) ids = [...ids, u.uid];
                                      } else {
                                        ids = ids.filter(id => id !== u.uid);
                                      }
                                      updated[idx].responsiblePersonIds = ids;
                                      setNewProjectActivities(updated);
                                    }}
                                  />
                                  <span className="truncate">{u.displayName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {newProjectActivities.length === 0 && (
                      <p className="text-xs font-bold text-slate-400 text-center py-2">ยังไม่มีกิจกรรมย่อย</p>
                    )}
                    {newProjectActivities.length < 10 && (
                      <button onClick={addActivityToNewProject} className="w-full py-4 mt-2 bg-[#6e2c00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#522000] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#6e2c00]/20 active:scale-[0.98]">
                        <Plus size={18} /> เพิ่มกิจกรรมใหม่
                      </button>
                    )}
                  </div>
                </div>

                <button type="button" onClick={handleAddProject} className="w-full mt-4 bg-[#1e3a8a] text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl shadow-xl hover:bg-[#172d6e] transition-all">
                  ยืนยันการสร้างโครงการ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {projectToDelete && (
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบโครงการ</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">
                  คุณต้องการลบโครงการ <span className="font-bold text-slate-800">{projectToDelete.name}</span> ใช่หรือไม่? <br/><br/>
                  <span className="text-rose-500 font-bold">คำเตือน:</span> กิจกรรมย่อยทั้งหมดภายใต้โครงการนี้จะถูกลบด้วย และไม่สามารถย้อนกลับได้
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setProjectToDelete(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={() => {
                      if (onDeleteProject) onDeleteProject(projectToDelete.id);
                      setProjectToDelete(null);
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
      </AnimatePresence>
    </div>
  );
}
