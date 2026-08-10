/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import BudgetOverview from './components/BudgetStats';
import BudgetRequestList from './components/BudgetRequestList';
import BudgetRequestForm from './components/BudgetRequestForm';
import ApprovalCenter from './components/ApprovalCenter';
import AdminPanel from './components/AdminPanel';
import UserManagement from './components/UserManagement';
import ReportSpentPage from './components/ReportSpentPage';
import TeamMembers from './components/TeamMembers';
import Login from './components/Login';
import SystemAlerts from './components/SystemAlerts';
import { useAuth, useFirestoreCollection } from './firebaseUtils';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import toast from 'react-hot-toast';
import { useConfirm } from './contexts/ConfirmContext';

import { 
  AppUser, 
  Project, 
  SubActivity, 
  BudgetRequest, 
  SystemAlert,
  UserRole
} from './types';

// Initial Mock Data
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'Marketing Q3 Campaign', description: 'Global brand awareness campaign', totalBudget: 250000, allocatedBudget: 150000, managerId: 'u2' },
  { id: 'p2', name: 'IT Infrastructure Upgrade', description: 'Server and networking hardware', totalBudget: 450000, allocatedBudget: 120000, managerId: 'u2' },
];

const INITIAL_ACTIVITIES: SubActivity[] = [
  { id: 'a1', projectId: 'p1', name: 'Digital Ads', initialBudget: 100000, spentBudget: 450000 },
  { id: 'a2', projectId: 'p1', name: 'Content Creation', initialBudget: 50000, spentBudget: 0 },
  { id: 'a3', projectId: 'p2', name: 'Cloud Expansion', initialBudget: 80000, spentBudget: 12450 },
  { id: 'a4', projectId: 'p2', name: 'Security Audit', initialBudget: 40000, spentBudget: 8000 },
];

export default function App() {
  const { currentUser, loading } = useAuth();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const projects = useFirestoreCollection<Project>('projects');
  const activities = useFirestoreCollection<SubActivity>('activities');
  const requests = useFirestoreCollection<BudgetRequest>('requests');
  const alerts = useFirestoreCollection<SystemAlert>('alerts');
  const allUsers = useFirestoreCollection<AppUser>('users');
  
  const [editingRequest, setEditingRequest] = useState<BudgetRequest | null>(null);

  const globalBudgetProj = projects.find(p => p.id === 'GLOBAL_BUDGET');
  const masterBudget = globalBudgetProj ? globalBudgetProj.totalBudget : 2500000;
  const displayProjects = projects.filter(p => p.id !== 'GLOBAL_BUDGET');

  // Calculations
  const stats = useMemo(() => {
    const total = masterBudget;
    const allocated = displayProjects.reduce((acc, p) => acc + p.totalBudget, 0);
    const approved = requests.filter(r => r.status === 'APPROVED').reduce((acc, r) => acc + r.amount, 0);
    const clearedSpent = requests.filter(r => r.status === 'CLEARED').reduce((acc, r) => acc + (r.actualSpent || 0), 0);
    const pending = requests.filter(r => r.status === 'PENDING').reduce((acc, r) => acc + r.amount, 0);
    
    return {
      total,
      approved,
      allocated,
      unallocated: Math.max(0, total - allocated),
      remaining: total - approved - clearedSpent
    };
  }, [displayProjects, requests, masterBudget]);

  // Actions
  const handleUpdateMasterBudget = async (amount: number) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'projects', 'GLOBAL_BUDGET'), { 
      id: 'GLOBAL_BUDGET', 
      name: 'GLOBAL_MASTER_BUDGET', 
      description: 'SYSTEM_DOC', 
      totalBudget: amount, 
      allocatedBudget: 0, 
      managerId: currentUser.uid 
    });
  };

  const handleUpdateProfile = async (newName: string, newPhotoURL?: string, newPassword?: string, newEmail?: string) => {
    if (!currentUser) return;
    try {
      // Update in Firebase Auth first to ensure it succeeds before updating DB
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: newName
        });
        
        // Update password if provided
        if (newPassword) {
          const { updatePassword } = await import('firebase/auth');
          await updatePassword(auth.currentUser, newPassword);
        }

        // Mock email update for local testing/competition
        if (newEmail) {
          // Store mapping from NEW email -> REAL auth email
          localStorage.setItem('mock_email_' + newEmail.toLowerCase(), auth.currentUser.email || '');
        }
      }

      // Update in Firestore only if Auth updates succeeded
      const updateData: any = { displayName: newName };
      if (newPhotoURL !== undefined) {
        updateData.photoURL = newPhotoURL;
      }
      if (newEmail) {
        updateData.email = newEmail;
      }
      await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      
      toast.success('อัปเดตโปรไฟล์เรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('การเปลี่ยนอีเมลหรือรหัสผ่านจำเป็นต้องเข้าสู่ระบบใหม่ กรุณาออกจากระบบแล้วเข้าใหม่ครับ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ' + error.message);
      }
    }
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleCreateRequest = async (data: Partial<BudgetRequest>, isEdit: boolean) => {
    const project = projects.find(p => p.id === data.projectId);
    const activity = activities.find(a => a.id === data.activityId);
    
    if (!isEdit) {
      const isDuplicate = requests.some(r => r.projectId === data.projectId && r.activityId === data.activityId && r.amount === data.amount && r.status === 'PENDING');
      if (isDuplicate) {
        const alertId1 = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'alerts', alertId1), { id: alertId1, type: 'DUPLICATE', message: `ระบบปฏิเสธคำขอซ้ำ: คุณได้ส่งคำขอซ้ำซ้อนในกิจกรรมเดียวกันแล้ว`, timestamp: Date.now(), userId: currentUser!.uid });
        const alertId2 = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'alerts', alertId2), { id: alertId2, type: 'DUPLICATE', message: `ตรวจพบการส่งคำขอซ้ำซ้อนจาก ${currentUser!.displayName} ในกิจกรรม ${activity?.name}`, timestamp: Date.now(), userId: 'ALL_ADMINS' });
        setShowRequestForm(false);
        return;
      }
      const newRequestId = `REQ-${Date.now().toString().slice(-6)}`;
      const now = Date.now();
      await setDoc(doc(db, 'requests', newRequestId), { 
        ...data, id: newRequestId, userId: currentUser!.uid, userName: currentUser!.displayName, userEmail: currentUser!.email, 
        projectName: project?.name || '', activityName: activity?.name || '', status: 'PENDING', createdAt: now, updatedAt: now,
        history: [{ action: 'CREATED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName }]
      });
      setShowRequestForm(false);
    } else {
      if (data.id) {
        const oldReq = requests.find(r => r.id === data.id);
        if (oldReq && (oldReq.status === 'APPROVED' || oldReq.status === 'CLEARED')) {
          // Adjust budget for old vs new amount/activity
          const oldActivity = activities.find(a => a.id === oldReq.activityId);
          if (oldActivity && oldActivity.id === data.activityId) {
            const diff = data.amount - oldReq.amount;
            await updateDoc(doc(db, 'activities', oldActivity.id), { spentBudget: oldActivity.spentBudget + diff });
          } else {
            if (oldActivity) await updateDoc(doc(db, 'activities', oldActivity.id), { spentBudget: oldActivity.spentBudget - oldReq.amount });
            const newActivity = activities.find(a => a.id === data.activityId);
            if (newActivity) await updateDoc(doc(db, 'activities', newActivity.id), { spentBudget: newActivity.spentBudget + data.amount });
          }
        }
        
        const now = Date.now();
        await updateDoc(doc(db, 'requests', data.id), { 
          projectId: data.projectId,
          activityId: data.activityId,
          amount: data.amount,
          quarter: data.quarter,
          responsiblePerson: data.responsiblePerson,
          reason: data.reason,
          projectName: project?.name || '', 
          activityName: activity?.name || '',
          updatedAt: now,
          history: arrayUnion({ action: 'EDITED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName })
        });
        setEditingRequest(null);
      }
    }
  };

  const handleApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const now = Date.now();

    await updateDoc(doc(db, 'requests', id), { 
      status: 'APPROVED', 
      approverId: currentUser!.uid, 
      approverName: currentUser!.displayName,
      updatedAt: now,
      history: arrayUnion({ action: 'APPROVED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName })
    });
    
    const activity = activities.find(a => a.id === req.activityId);
    if (activity) {
      await updateDoc(doc(db, 'activities', activity.id), { spentBudget: activity.spentBudget + req.amount });
    }

    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'STATUS_UPDATE',
      message: `คำขอ ${req.id} กิจกรรม ${req.activityName} ได้รับการอนุมัติโดย ${currentUser!.displayName}`,
      timestamp: now,
      userId: req.userId,
      relatedRequestId: req.id
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
    toast.success('อนุมัติคำขอเรียบร้อยแล้ว');
  };

  const handleReject = async (id: string, remark: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const now = Date.now();
    await updateDoc(doc(db, 'requests', id), { 
      status: 'REJECTED', remark, 
      approverId: currentUser!.uid, 
      approverName: currentUser!.displayName,
      updatedAt: now,
      history: arrayUnion({ action: 'REJECTED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName, remark })
    });
    const alertId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'alerts', alertId), { id: alertId, type: 'STATUS_UPDATE', message: `คำขอ ${req.id} ถูกปฏิเสธโดย ${currentUser!.displayName} เหตุผล: ${remark}`, timestamp: now, relatedRequestId: id, userId: req.userId });
    toast.error('ปฏิเสธคำขอเรียบร้อยแล้ว');
  };

  const handleReportSpent = async (id: string, actualSpent: number, actualSpentMonthly?: Record<string, number>) => {
    try {
      const req = requests.find(r => r.id === id);
      if (!req || req.status !== 'APPROVED') return;
      
      // Update request
      const now = Date.now();
      const updateData: any = {
        status: 'CLEARED', 
        actualSpent, 
        updatedAt: now,
        history: arrayUnion({ action: 'CLEARED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName })
      };
      
      if (actualSpentMonthly) {
        updateData.actualSpentMonthly = actualSpentMonthly;
      }

      await updateDoc(doc(db, 'requests', id), updateData);
      
      // Refund difference to activity
      const activity = activities.find(a => a.id === req.activityId);
      if (activity) {
        await updateDoc(doc(db, 'activities', activity.id), { 
          spentBudget: activity.spentBudget - req.amount + actualSpent 
        });
      }

      const alertId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'alerts', alertId), { 
        id: alertId, 
        type: 'STATUS_UPDATE', 
        message: `รายการเบิกจ่ายโครงการ ${req.projectName} ได้ถูกบันทึกยอดการใช้จ่ายแล้ว`, 
        timestamp: Date.now(), 
        relatedRequestId: id, 
        userId: req.userId 
      });
    } catch (error: any) {
      console.error("Error reporting spent:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่ายจริง: " + error.message);
    }
  };

  const handleAddProjectWithActivities = async (project: any, newActivities: any[]) => {
    const newProjectId = `p${Date.now()}`;
    await setDoc(doc(db, 'projects', newProjectId), { ...project, id: newProjectId, managerId: currentUser!.uid, allocatedBudget: 0 });
    
    for (let i = 0; i < newActivities.length; i++) {
      const a = newActivities[i];
      const aid = `a${Date.now()}_${i}`;
      await setDoc(doc(db, 'activities', aid), {
        ...a,
        id: aid,
        projectId: newProjectId,
        spentBudget: 0
      });
    }
  };

  const handleUpdateProjectWithActivities = async (projectId: string, projectData: any, updatedActivities: any[]) => {
    await updateDoc(doc(db, 'projects', projectId), projectData);
    
    // Simplification for the mockup: Just updating existing or creating new ones.
    for (let i = 0; i < updatedActivities.length; i++) {
      const a = updatedActivities[i];
      const aid = a.id || `a${Date.now()}_${i}`;
      await setDoc(doc(db, 'activities', aid), {
        ...a,
        id: aid,
        projectId: projectId,
        spentBudget: a.spentBudget || 0
      }, { merge: true });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteDoc(doc(db, 'projects', projectId));
    const projectActs = activities.filter(a => a.projectId === projectId);
    for (const a of projectActs) {
      await deleteDoc(doc(db, 'activities', a.id));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  };

  const handleAddUser = async (user: any, password?: string) => {
    try {
      // Use Firebase REST API to create user - avoids ALL auth state issues
      const apiKey = firebaseConfig.apiKey;
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: password || 'password123',
            returnSecureToken: false
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data?.error?.message || 'UNKNOWN_ERROR';
        if (errorMessage === 'EMAIL_EXISTS') {
          toast.error('อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่น');
        } else if (errorMessage.includes('WEAK_PASSWORD')) {
          toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        } else if (errorMessage === 'INVALID_EMAIL') {
          toast.error('รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        } else {
          toast.error('เกิดข้อผิดพลาด: ' + errorMessage);
        }
        return;
      }
      
      const newUid = data.localId;
      
      // Write user doc using admin's Firestore connection (no auth interference)
      await setDoc(doc(db, 'users', newUid), { ...user, uid: newUid });
      
      toast.success('เพิ่มผู้ใช้งานสำเร็จ!');
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error('เกิดข้อผิดพลาดในการสร้างผู้ใช้: ' + (err?.message || 'ไม่ทราบสาเหตุ'));
    }
  };

  const handleResetData = async () => {
    const isConfirmed = await confirm({
      title: 'ล้างข้อมูลทั้งหมด?',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูล คำขอ, โครงการ, และกิจกรรมทั้งหมด นี่คือการกระทำที่ไม่สามารถย้อนกลับได้',
      confirmText: 'ล้างข้อมูล',
      isDestructive: true
    });
    
    if (!isConfirmed) return;
    try {
      for (const p of projects) await deleteDoc(doc(db, 'projects', p.id));
      for (const a of activities) await deleteDoc(doc(db, 'activities', a.id));
      for (const r of requests) await deleteDoc(doc(db, 'requests', r.id));
      for (const a of alerts) await deleteDoc(doc(db, 'alerts', a.id));
      toast.success('ล้างข้อมูลเรียบร้อยแล้ว (จะรีเฟรชหน้าเว็บใน 2 วินาที)');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('เกิดข้อผิดพลาดในการล้างข้อมูล');
    }
  };

  const handleUpdateUser = async (userId: string, data: { displayName?: string, role?: string, projectAuth?: string[] }, activityAuth?: string[]) => {
    await updateDoc(doc(db, 'users', userId), data);
    
    if (activityAuth !== undefined) {
      // Find all activities this user is currently responsible for
      const currentAssigned = activities.filter(a => a.responsiblePersonIds?.includes(userId));
      
      // Activities to remove the user from
      const toRemove = currentAssigned.filter(a => !activityAuth.includes(a.id));
      for (const a of toRemove) {
        const newIds = (a.responsiblePersonIds || []).filter(id => id !== userId);
        await updateDoc(doc(db, 'activities', a.id), { responsiblePersonIds: newIds });
      }

      // Activities to add the user to
      const toAddIds = activityAuth.filter(id => !currentAssigned.find(a => a.id === id));
      for (const aid of toAddIds) {
        const a = activities.find(act => act.id === aid);
        if (a) {
          const newIds = [...(a.responsiblePersonIds || []), userId];
          if (newIds.length <= 3) {
            await updateDoc(doc(db, 'activities', a.id), { responsiblePersonIds: newIds });
          } else {
            alert(`ไม่สามารถเพิ่มผู้รับผิดชอบเกิน 3 คนในกิจกรรม ${a.name} ได้`);
          }
        }
      }
    }
  };

  const handleEditRequest = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      setEditingRequest(req);
    }
  };

  const handleCancelRequest = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    
    if (req.status === 'APPROVED' || req.status === 'CLEARED') {
      const activity = activities.find(a => a.id === req.activityId);
      if (activity) {
        const spent = req.status === 'CLEARED' && req.actualSpent !== undefined ? req.actualSpent : req.amount;
        await updateDoc(doc(db, 'activities', activity.id), { spentBudget: activity.spentBudget - spent });
      }
    }

    const now = Date.now();
    await updateDoc(doc(db, 'requests', id), { 
      status: 'REJECTED', 
      remark: 'ยกเลิกคำขอ', 
      updatedAt: now,
      history: arrayUnion({ action: 'REJECTED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName, remark: 'ยกเลิกคำขอ' })
    });
    const alertId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'alerts', alertId), {
      id: alertId, type: 'INFO', message: `คำขอ ${id} ถูกยกเลิก`, timestamp: now, userId: 'ALL'
    });
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      const req = requests.find(r => r.id === id);
      if (!req) return;
      
      if (req.status === 'APPROVED' || req.status === 'CLEARED') {
        const activity = activities.find(a => a.id === req.activityId);
        if (activity) {
          const spent = req.status === 'CLEARED' && req.actualSpent !== undefined ? req.actualSpent : req.amount;
          await updateDoc(doc(db, 'activities', activity.id), { spentBudget: activity.spentBudget - spent });
        }
      }

      await deleteDoc(doc(db, 'requests', id));
      const alertId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId, type: 'INFO', message: `ลบคำขอ ${id} เรียบร้อยแล้ว`, timestamp: Date.now(), userId: 'ALL'
      });
      toast.success("ลบคำขอเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error deleting request:", error);
      toast.error("เกิดข้อผิดพลาดในการลบคำขอ: " + error.message);
    }
  };

  const handleRevokeApproval = async (id: string) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกการอนุมัตินี้? ระบบจะดึงเงินกลับคืนสู่โครงการทันที")) return;
    try {
      const req = requests.find(r => r.id === id);
      if (!req) return;
      
      if (req.status === 'APPROVED' || req.status === 'CLEARED') {
        const activity = activities.find(a => a.id === req.activityId);
        if (activity) {
          const spent = req.status === 'CLEARED' && req.actualSpent !== undefined ? req.actualSpent : req.amount;
          await updateDoc(doc(db, 'activities', activity.id), { spentBudget: activity.spentBudget - spent });
        }
      }

      const now = Date.now();
      await updateDoc(doc(db, 'requests', id), {
        status: 'REJECTED',
        remark: 'ยกเลิกการอนุมัติและดึงเงินคืน',
        updatedAt: now,
        history: arrayUnion({ action: 'REJECTED', timestamp: now, userId: currentUser!.uid, userName: currentUser!.displayName, remark: 'ยกเลิกการอนุมัติและดึงเงินคืน' })
      });

      const alertId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId, type: 'INFO', message: `ยกเลิกการอนุมัติคำขอ ${id} และดึงเงินคืนเรียบร้อยแล้ว`, timestamp: Date.now(), userId: 'ALL'
      });
      toast.success("ยกเลิกการอนุมัติและดึงเงินคืนเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("Error revoking approval:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleDismissAlert = async (id: string) => {
    await deleteDoc(doc(db, 'alerts', id));
  };

  const handleBroadcast = async (message: string) => {
    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'INFO',
      message: message,
      timestamp: Date.now(),
      userId: 'ALL',
      announcerName: currentUser.displayName,
      announcerPhoto: currentUser.photoURL
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
  };

  if (!currentUser) {
    return <Login />;
  }

  const userRequests = requests.filter(r => r.userId === currentUser.uid);
  const pendingForApprover = requests.filter(r => 
    r.status === 'PENDING' && 
    (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || (currentUser.role === 'APPROVER' && currentUser.projectAuth?.includes(r.projectId)))
  );

  const reportRequests = currentUser.role === 'ADMIN' ? requests : userRequests;
  const clearedRequestsCount = reportRequests.filter(r => r.status === 'CLEARED').length;

  return (
    <Layout 
      user={currentUser} 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onLogout={handleLogout}
      onUpdateProfile={handleUpdateProfile}
      alerts={alerts}
      onDismissAlert={handleDismissAlert}
      onBroadcast={['ADMIN', 'MANAGER'].includes(currentUser.role) ? handleBroadcast : undefined}
      pendingApprovalCount={pendingForApprover.length}
      clearedReportCount={clearedRequestsCount}
    >
      <div className="space-y-10 pb-20">
        {activeTab === 'dashboard' && (
          <>
            <header className="flex flex-col sm:flex-row justify-between items-end gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">ภาพรวมการเงิน</p>
                <h2 className="text-5xl font-extrabold tracking-tight text-slate-800">แผงควบคุมระบบ</h2>
              </div>
              <div className="flex gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 px-6 py-3 rounded-2xl shadow-sm border border-emerald-100/50 hidden md:flex md:flex-col justify-center">
                  <p className="text-[10px] text-teal-600/70 font-bold uppercase tracking-widest">งบประมาณคงเหลือ</p>
                  <p className="text-2xl font-extrabold text-teal-700 tracking-tight">฿ {stats.remaining.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => setShowRequestForm(true)}
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95 border border-indigo-500"
                >
                  สร้างคำขอใหม่
                </button>
              </div>
            </header>
            <BudgetOverview {...stats} projects={displayProjects} activities={activities} requests={requests} users={allUsers} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <BudgetRequestList 
                  requests={requests}
                  isAdmin={currentUser.role === 'ADMIN'}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEditRequest}
                  onCancel={handleCancelRequest}
                  onDelete={handleDeleteRequest}
                  onReportSpent={handleReportSpent}
                  users={allUsers}
                  activities={activities}
                />
                
                <TeamMembers 
                  users={allUsers}
                  projects={displayProjects}
                  activities={activities}
                />
              </div>
              <div className="lg:col-span-4 space-y-10">
                <SystemAlerts 
                  alerts={alerts.filter(a => a.userId === currentUser.uid || a.userId === 'ALL')} 
                  onDismiss={handleDismissAlert} 
                  onBroadcast={['ADMIN', 'MANAGER'].includes(currentUser.role) ? handleBroadcast : undefined}
                />
                
                <BudgetPieChart projects={displayProjects} masterBudget={masterBudget} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'my-requests' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">ขออนุมัติโครงการ</h2>
                <p className="text-gray-500 mt-1">ติดตามรายการคำของบประมาณที่เสนอไปแล้ว</p>
              </div>
              <button 
                onClick={() => setShowRequestForm(true)}
                className="bg-blue-900 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all active:scale-95"
              >
                + สร้างคำขอใหม่
              </button>
            </header>
            <BudgetRequestList 
              requests={userRequests} 
              isAdmin={currentUser.role === 'ADMIN'}
              onApprove={['ADMIN', 'MANAGER', 'APPROVER'].includes(currentUser.role) ? handleApprove : undefined}
              onReject={['ADMIN', 'MANAGER', 'APPROVER'].includes(currentUser.role) ? handleReject : undefined}
              onEdit={handleEditRequest}
              onCancel={handleCancelRequest}
              onDelete={handleDeleteRequest}
              onReportSpent={handleReportSpent}
              users={allUsers}
              activities={activities}
            />
          </div>
        )}

        {activeTab === 'report-spent' && (
          <ReportSpentPage 
            requests={reportRequests}
            allRequests={requests}
            onReportSpent={handleReportSpent}
            users={allUsers}
            activities={activities}
          />
        )}

        {activeTab === 'approval' && (
          <ApprovalCenter 
            pendingRequests={pendingForApprover} 
            allRequests={requests}
            users={allUsers}
            onApprove={handleApprove} 
            onReject={handleReject}
            onDelete={handleDeleteRequest}
            onRevoke={handleRevokeApproval}
            onEdit={handleEditRequest}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel 
            currentUserId={currentUser.uid}
            projects={displayProjects} 
            activities={activities} 
            users={allUsers}
            masterBudget={masterBudget}
            onUpdateMasterBudget={handleUpdateMasterBudget}
            onUpdateRole={async (uid, role) => await updateDoc(doc(db, 'users', uid), { role })}
            onUpdateBudget={async (id, totalBudget) => await updateDoc(doc(db, 'projects', id), { totalBudget })}
            onAddProject={async (p) => { const newId = `p${Date.now()}`; await setDoc(doc(db, 'projects', newId), { ...p, id: newId, managerId: currentUser!.uid, allocatedBudget: 0 }); }}
            onAddActivity={async (a) => { const aid = `a${Date.now()}`; await setDoc(doc(db, 'activities', aid), { ...a, id: aid, spentBudget: 0 }); }}
            onAddProjectWithActivities={handleAddProjectWithActivities}
            onUpdateProjectWithActivities={handleUpdateProjectWithActivities}
            onAddUser={handleAddUser}
            onDeleteProject={handleDeleteProject}
            onDeleteUser={handleDeleteUser}
            onUpdateUser={handleUpdateUser}
            onResetData={handleResetData}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement 
            currentUserId={currentUser.uid}
            users={allUsers}
            projects={displayProjects}
            activities={activities}
            isAdmin={currentUser.role === 'ADMIN'}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </div>

      {showRequestForm && (
        <BudgetRequestForm 
          projects={displayProjects} 
          activities={activities} 
          users={allUsers}
          onClose={() => setShowRequestForm(false)} 
          onSubmit={handleCreateRequest}
          remainingBudget={stats.remaining}
        />
      )}

      {editingRequest && (
        <BudgetRequestForm 
          projects={displayProjects} 
          activities={activities} 
          users={allUsers}
          initialData={editingRequest}
          onClose={() => setEditingRequest(null)} 
          onSubmit={handleCreateRequest}
          remainingBudget={stats.remaining}
        />
      )}
    </Layout>
  );
}

const CHART_COLORS = ['#1e3a8a', '#10b981', '#6e2c00', '#7c3aed', '#dc2626', '#0891b2', '#ca8a04', '#be185d'];

function BudgetPieChart({ projects, masterBudget }: { projects: Project[], masterBudget: number }) {
  const circumference = 2 * Math.PI * 40; // ~251.2
  const totalAllocated = projects.reduce((acc, p) => acc + p.totalBudget, 0);
  const unallocated = Math.max(0, masterBudget - totalAllocated);

  // Build segments
  const segments: { name: string, value: number, color: string, pct: number }[] = [];
  projects.forEach((p, i) => {
    const pct = masterBudget > 0 ? (p.totalBudget / masterBudget) * 100 : 0;
    segments.push({ name: p.name, value: p.totalBudget, color: CHART_COLORS[i % CHART_COLORS.length], pct });
  });
  if (unallocated > 0) {
    const pct = masterBudget > 0 ? (unallocated / masterBudget) * 100 : 0;
    segments.push({ name: 'ยังไม่จัดสรร', value: unallocated, color: '#e2e8f0', pct });
  }

  let accOffset = 0;
  const allocatedPct = masterBudget > 0 ? Math.round((totalAllocated / masterBudget) * 100) : 0;

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold tracking-tight mb-8">สัดส่วนการจัดสรรงบประมาณ</h3>
      <div className="aspect-square relative flex items-center justify-center max-w-[200px] mx-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">จัดสรรแล้ว</p>
            <p className="text-xl font-bold text-[#1e3a8a]">{allocatedPct}%</p>
          </div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full h-full transform -rotate-90">
          {segments.map((seg, i) => {
            const dashLen = (seg.pct / 100) * circumference;
            const offset = accOffset;
            accOffset += dashLen;
            return (
              <circle key={i} cx="50" cy="50" r="40" fill="transparent" stroke={seg.color} strokeWidth="12" strokeDasharray={`${dashLen} ${circumference - dashLen}`} strokeDashoffset={-offset} />
            );
          })}
        </svg>
      </div>
      <div className="mt-8 space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }}></div>
              <span className="font-medium text-gray-600">{seg.name}</span>
            </div>
            <span className="font-bold text-gray-900">{Math.round(seg.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
