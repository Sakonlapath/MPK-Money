import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

# handleAddProjectWithActivities
old = """  const handleAddProjectWithActivities = (project: any, newActivities: any[]) => {
    const newProjectId = `p${projects.length + 1}`;
    setProjects([...projects, { ...project, id: newProjectId, managerId: currentUser.uid, allocatedBudget: 0 }]);
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

old = """onAddProject={(p) => setProjects([...projects, { ...p, id: `p${projects.length + 1}`, managerId: currentUser.uid, allocatedBudget: 0 }])}"""
new = """onAddProject={async (p) => { const newId = `p${Date.now()}`; await setDoc(doc(db, 'projects', newId), { ...p, id: newId, managerId: currentUser!.uid, allocatedBudget: 0 }); }}"""
content = content.replace(old, new)

with open('src/App.tsx', 'w') as f:
    f.write(content)
