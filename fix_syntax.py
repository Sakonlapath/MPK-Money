with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("onUpdateRole={async (uid, role) => await updateDoc(doc(db, 'users', uid), { role })} : u))}", 
"onUpdateRole={async (uid, role) => await updateDoc(doc(db, 'users', uid), { role })}")

content = content.replace("onAddActivity={async (a) => { const aid = `a${Date.now()}`; await setDoc(doc(db, 'activities', aid), { ...a, id: aid, spentBudget: 0 }); }}`, spentBudget: 0 }])}", 
"onAddActivity={async (a) => { const aid = `a${Date.now()}`; await setDoc(doc(db, 'activities', aid), { ...a, id: aid, spentBudget: 0 }); }}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
