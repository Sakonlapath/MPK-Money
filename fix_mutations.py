import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. handleCreateRequest
old = """  const handleCreateRequest = (data: Partial<BudgetRequest>) => {
    const project = projects.find(p => p.id === data.projectId);
    const activity = activities.find(a => a.id === data.activityId);

    // Duplicate Check
    const isDuplicate = requests.some(r => 
      r.projectId === data.projectId && 
      r.activityId === data.activityId && 
      r.amount === data.amount &&
      r.status === 'PENDING'
    );

    if (isDuplicate) {
      const newAlert: SystemAlert = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'DUPLICATE',
        message: `ตรวจพบคำขอซ้ำซ้อนสำหรับกิจกรรม ${activity?.name} จำนวน ฿${data.amount?.toLocaleString()}`,
        timestamp: Date.now(),
        relatedRequestId: requests.find(r => r.projectId === data.projectId && r.activityId === data.activityId && r.amount === data.amount && r.status === 'PENDING')?.id,
        userId: currentUser!.uid
      };
      setAlerts([newAlert, ...alerts]);
      return;
    }

    const newRequest: BudgetRequest = {
      ...data as BudgetRequest,
      id: `REQ-${Date.now().toString().slice(-6)}`,
      userId: currentUser!.uid,
      userName: currentUser!.displayName,
      userEmail: currentUser!.email,
      projectName: project?.name || '',
      activityName: activity?.name || '',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setRequests([newRequest, ...requests]);
    setShowRequestForm(false);
  };"""
new = """  const handleCreateRequest = async (data: Partial<BudgetRequest>) => {
    const project = projects.find(p => p.id === data.projectId);
    const activity = activities.find(a => a.id === data.activityId);

    const isDuplicate = requests.some(r => 
      r.projectId === data.projectId && 
      r.activityId === data.activityId && 
      r.amount === data.amount &&
      r.status === 'PENDING'
    );

    if (isDuplicate) {
      const newAlert: SystemAlert = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'DUPLICATE',
        message: `ตรวจพบคำขอซ้ำซ้อนสำหรับกิจกรรม ${activity?.name} จำนวน ฿${data.amount?.toLocaleString()}`,
        timestamp: Date.now(),
        relatedRequestId: requests.find(r => r.projectId === data.projectId && r.activityId === data.activityId && r.amount === data.amount && r.status === 'PENDING')?.id,
        userId: currentUser!.uid
      };
      await setDoc(doc(db, 'alerts', newAlert.id), newAlert);
      return;
    }

    const newRequestId = `REQ-${Date.now().toString().slice(-6)}`;
    const newRequest: BudgetRequest = {
      ...data as BudgetRequest,
      id: newRequestId,
      userId: currentUser!.uid,
      userName: currentUser!.displayName,
      userEmail: currentUser!.email,
      projectName: project?.name || '',
      activityName: activity?.name || '',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await setDoc(doc(db, 'requests', newRequestId), newRequest);
    setShowRequestForm(false);
  };"""
content = content.replace(old, new)

# 2. handleApprove
old = """  const handleApprove = (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED', approverId: currentUser!.uid, updatedAt: Date.now() } : r));
    
    // Update activity spent budget
    setActivities(activities.map(a => a.id === req.activityId ? { ...a, spentBudget: a.spentBudget + req.amount } : a));

    // Alert User
    const newAlert: SystemAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'STATUS_UPDATE',
      message: `Your budget request ${req.id} has been APPROVED.`,
      timestamp: Date.now(),
      relatedRequestId: id,
      userId: req.userId
    };
    setAlerts([newAlert, ...alerts]);
  };"""
new = """  const handleApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'requests', id), { status: 'APPROVED', approverId: currentUser!.uid, updatedAt: Date.now() });
    
    const activity = activities.find(a => a.id === req.activityId);
    if (activity) {
      await updateDoc(doc(db, 'activities', activity.id), { spentBudget: activity.spentBudget + req.amount });
    }

    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'STATUS_UPDATE',
      message: `Your budget request ${req.id} has been APPROVED.`,
      timestamp: Date.now(),
      relatedRequestId: id,
      userId: req.userId
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
  };"""
content = content.replace(old, new)

# 3. handleReject
old = """  const handleReject = (id: string, remark: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED', remark, approverId: currentUser!.uid, updatedAt: Date.now() } : r));

    // Alert User
    const newAlert: SystemAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'STATUS_UPDATE',
      message: `Your budget request ${req.id} has been REJECTED. Remark: ${remark}`,
      timestamp: Date.now(),
      relatedRequestId: id,
      userId: req.userId
    };
    setAlerts([newAlert, ...alerts]);
  };"""
new = """  const handleReject = async (id: string, remark: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', remark, approverId: currentUser!.uid, updatedAt: Date.now() });

    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'STATUS_UPDATE',
      message: `Your budget request ${req.id} has been REJECTED. Remark: ${remark}`,
      timestamp: Date.now(),
      relatedRequestId: id,
      userId: req.userId
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
  };"""
content = content.replace(old, new)

# 4. handleAddProjectWithActivities
old = """  const handleAddProjectWithActivities = (project: any, newActivities: any[]) => {
    const newProjectId = `p${projects.length + 1}`;
    setProjects([...projects, { ...project, id: newProjectId, managerId: currentUser!.uid, allocatedBudget: 0 }]);
    const addedActivities = newActivities.map((a: any, i: number) => ({
      ...a,
      id: `a${Date.now()}_${i}`,
      projectId: newProjectId,
      spentBudget: 0
    }));
    setActivities([...activities, ...addedActivities]);
  };"""
new = """  const handleAddProjectWithActivities = async (project: any, newActivities: any[]) => {
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
  };"""
content = content.replace(old, new)

# 5. handleUpdateProjectWithActivities
old = """  const handleUpdateProjectWithActivities = (projectId: string, projectData: any, updatedActivities: any[]) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, ...projectData } : p));
    const otherActivities = activities.filter(a => a.projectId !== projectId);
    const newActivities = updatedActivities.map((a, i) => ({
      ...a,
      id: a.id || `a${Date.now()}_${i}`,
      projectId: projectId,
      spentBudget: a.spentBudget || 0
    }));
    setActivities([...otherActivities, ...newActivities]);
  };"""
new = """  const handleUpdateProjectWithActivities = async (projectId: string, projectData: any, updatedActivities: any[]) => {
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
  };"""
content = content.replace(old, new)

# 6. handleDeleteProject
old = """  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    setActivities(activities.filter(a => a.projectId !== projectId));
  };"""
new = """  const handleDeleteProject = async (projectId: string) => {
    await deleteDoc(doc(db, 'projects', projectId));
    const projectActs = activities.filter(a => a.projectId === projectId);
    for (const a of projectActs) {
      await deleteDoc(doc(db, 'activities', a.id));
    }
  };"""
content = content.replace(old, new)

# 7. handleDeleteUser
old = """  const handleDeleteUser = (userId: string) => {
    setAllUsers(allUsers.filter(u => u.uid !== userId));
  };"""
new = """  const handleDeleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  };"""
content = content.replace(old, new)

# 8. handleAddUser
old = """  const handleAddUser = (user: any) => {
    setAllUsers([...allUsers, { ...user, uid: `u${allUsers.length + 1}` }]);
  };"""
new = """  const handleAddUser = async (user: any) => {
    const newUid = `u${Date.now()}`;
    await setDoc(doc(db, 'users', newUid), { ...user, uid: newUid });
  };"""
content = content.replace(old, new)

# 9. saveEditRequest
old = """  const saveEditRequest = () => {
    if (!editingRequestId) return;
    const amountNum = parseInt(editAmount.replace(/[^0-9]/g, ''), 10);
    if (!amountNum) return;
    
    setRequests(requests.map(r => r.id === editingRequestId ? { ...r, amount: amountNum, updatedAt: Date.now() } : r));
    setEditingRequestId(null);
  };"""
new = """  const saveEditRequest = async () => {
    if (!editingRequestId) return;
    const amountNum = parseInt(editAmount.replace(/[^0-9]/g, ''), 10);
    if (!amountNum) return;
    
    await updateDoc(doc(db, 'requests', editingRequestId), { amount: amountNum, updatedAt: Date.now() });
    setEditingRequestId(null);
  };"""
content = content.replace(old, new)

# 10. handleCancelRequest
old = """  const handleCancelRequest = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED', remark: 'ยกเลิกโดยผู้ดูแลระบบ', updatedAt: Date.now() } : r));
    const newAlert: SystemAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'INFO',
      message: `ผู้ดูแลระบบได้ยกเลิกคำขอ ${id}`,
      timestamp: Date.now(),
      userId: 'ALL',
    };
    setAlerts([newAlert, ...alerts]);
  };"""
new = """  const handleCancelRequest = async (id: string) => {
    await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', remark: 'ยกเลิกโดยผู้ดูแลระบบ', updatedAt: Date.now() });
    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'INFO',
      message: `ผู้ดูแลระบบได้ยกเลิกคำขอ ${id}`,
      timestamp: Date.now(),
      userId: 'ALL',
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
  };"""
content = content.replace(old, new)

# 11. handleDeleteRequest
old = """  const handleDeleteRequest = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
    const newAlert: SystemAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'INFO',
      message: `ผู้ดูแลระบบได้ลบคำขอ ${id}`,
      timestamp: Date.now(),
      userId: 'ALL',
    };
    setAlerts([newAlert, ...alerts]);
  };"""
new = """  const handleDeleteRequest = async (id: string) => {
    await deleteDoc(doc(db, 'requests', id));
    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert: SystemAlert = {
      id: alertId,
      type: 'INFO',
      message: `ผู้ดูแลระบบได้ลบคำขอ ${id}`,
      timestamp: Date.now(),
      userId: 'ALL',
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);
  };"""
content = content.replace(old, new)

# 12. onUpdateBudget / onAddProject inline functions
old = """onUpdateBudget={(id, totalBudget) => setProjects(projects.map(p => p.id === id ? { ...p, totalBudget } : p))}"""
new = """onUpdateBudget={async (id, totalBudget) => await updateDoc(doc(db, 'projects', id), { totalBudget })}"""
content = content.replace(old, new)

old = """onAddProject={(p) => setProjects([...projects, { ...p, id: `p${projects.length + 1}`, managerId: currentUser!.uid, allocatedBudget: 0 }])}"""
new = """onAddProject={async (p) => { const newId = `p${Date.now()}`; await setDoc(doc(db, 'projects', newId), { ...p, id: newId, managerId: currentUser!.uid, allocatedBudget: 0 }); }}"""
content = content.replace(old, new)

old = """onDismiss={(id) => setAlerts(alerts.filter(a => a.id !== id))}"""
new = """onDismiss={async (id) => await deleteDoc(doc(db, 'alerts', id))}"""
content = content.replace(old, new)

with open('src/App.tsx', 'w') as f:
    f.write(content)
