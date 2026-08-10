with open('src/App.tsx', 'r') as f:
    content = f.read()

import re

content = re.sub(r'const handleApprove = \(id: string\) => \{.*?\setAlerts\(\[newAlert, \.\.\.alerts\]\);\n  \};', 
r'''const handleApprove = async (id: string) => {
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
  };''', content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
