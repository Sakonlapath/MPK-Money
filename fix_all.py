import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

# handleCreateRequest
content = re.sub(r'const handleCreateRequest = \(data: Partial<BudgetRequest>\) => \{.*?\n  \};',
r'''const handleCreateRequest = async (data: Partial<BudgetRequest>) => {
    const project = projects.find(p => p.id === data.projectId);
    const activity = activities.find(a => a.id === data.activityId);
    const isDuplicate = requests.some(r => r.projectId === data.projectId && r.activityId === data.activityId && r.amount === data.amount && r.status === 'PENDING');
    if (isDuplicate) {
      const alertId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'alerts', alertId), { id: alertId, type: 'DUPLICATE', message: `Duplicate request`, timestamp: Date.now(), userId: currentUser!.uid });
      return;
    }
    const newRequestId = `REQ-${Date.now().toString().slice(-6)}`;
    await setDoc(doc(db, 'requests', newRequestId), { ...data, id: newRequestId, userId: currentUser!.uid, userName: currentUser!.displayName, userEmail: currentUser!.email, projectName: project?.name || '', activityName: activity?.name || '', status: 'PENDING', createdAt: Date.now(), updatedAt: Date.now() });
    setShowRequestForm(false);
  };''', content, flags=re.DOTALL)

# handleReject
content = re.sub(r'const handleReject = \(id: string, remark: string\) => \{.*?\n  \};',
r'''const handleReject = async (id: string, remark: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', remark, approverId: currentUser!.uid, updatedAt: Date.now() });
    const alertId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'alerts', alertId), { id: alertId, type: 'STATUS_UPDATE', message: `Your budget request ${req.id} has been REJECTED. Remark: ${remark}`, timestamp: Date.now(), relatedRequestId: id, userId: req.userId });
  };''', content, flags=re.DOTALL)

# handleCancelRequest
content = re.sub(r'const handleCancelRequest = \(id: string\) => \{.*?\n  \};',
r'''const handleCancelRequest = async (id: string) => {
    await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', remark: 'ยกเลิกโดยผู้ดูแลระบบ', updatedAt: Date.now() });
    const alertId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'alerts', alertId), { id: alertId, type: 'INFO', message: `ผู้ดูแลระบบได้ยกเลิกคำขอ ${id}`, timestamp: Date.now(), userId: 'ALL' });
  };''', content, flags=re.DOTALL)

# handleDeleteRequest
content = re.sub(r'const handleDeleteRequest = \(id: string\) => \{.*?\n  \};',
r'''const handleDeleteRequest = async (id: string) => {
    await deleteDoc(doc(db, 'requests', id));
    const alertId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'alerts', alertId), { id: alertId, type: 'INFO', message: `ผู้ดูแลระบบได้ลบคำขอ ${id}`, timestamp: Date.now(), userId: 'ALL' });
  };''', content, flags=re.DOTALL)

# saveEditRequest
content = re.sub(r'const saveEditRequest = \(\) => \{.*?\n  \};',
r'''const saveEditRequest = async () => {
    if (!editingRequestId) return;
    const amountNum = parseInt(editAmount.replace(/[^0-9]/g, ''), 10);
    if (!amountNum) return;
    await updateDoc(doc(db, 'requests', editingRequestId), { amount: amountNum, updatedAt: Date.now() });
    setEditingRequestId(null);
  };''', content, flags=re.DOTALL)

# Inline ones
content = re.sub(r'onUpdateRole=\{\(uid, role\) => .*?\}', r'''onUpdateRole={async (uid, role) => await updateDoc(doc(db, 'users', uid), { role })}''', content)
content = re.sub(r'onAddActivity=\{\(a\) => .*?\}', r'''onAddActivity={async (a) => { const aid = `a${Date.now()}`; await setDoc(doc(db, 'activities', aid), { ...a, id: aid, spentBudget: 0 }); }}''', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
