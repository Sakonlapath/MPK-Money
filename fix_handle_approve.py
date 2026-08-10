import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

old = """    const req = requests.find(r => r.id === id);
    if (!req) return;

    setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED', approverId: currentUser!.uid, updatedAt: Date.now() } : r));
    
    // Update activity spent budget
    setActivities(activities.map(a => a.id === req.activityId ? { ...a, spentBudget: a.spentBudget + req.amount } : a));

    // Alert User
    const newAlert: SystemAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'STATUS_UPDATE',
      message: `Your budget request ${req.id} for ${req.activityName} has been APPROVED.`,
      timestamp: Date.now(),
      userId: req.userId,
      relatedRequestId: req.id
    };
    setAlerts([newAlert, ...alerts]);"""

new = """    const req = requests.find(r => r.id === id);
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
      message: `Your budget request ${req.id} for ${req.activityName} has been APPROVED.`,
      timestamp: Date.now(),
      userId: req.userId,
      relatedRequestId: req.id
    };
    await setDoc(doc(db, 'alerts', alertId), newAlert);"""

content = content.replace(old, new)
with open('src/App.tsx', 'w') as f:
    f.write(content)
