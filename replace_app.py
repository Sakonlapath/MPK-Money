import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { \n  AppUser,", "import { useAuth, useFirestoreCollection } from './firebaseUtils';\nimport { db, handleFirestoreError, OperationType } from './firebase';\nimport { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';\nimport { signOut } from 'firebase/auth';\nimport { auth } from './firebase';\n\nimport { \n  AppUser,")

# Replace states
old_states = """  // Auth State (Simulated since Firebase declined)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestForm, setShowRequestForm] = useState(false);

  // App State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<SubActivity[]>([]);
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [masterBudget, setMasterBudget] = useState(2500000);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [allUsers, setAllUsers] = useState<AppUser[]>([
    { uid: 'u1', email: 'admin@bento.com', displayName: 'Sarah Jenkins', role: 'ADMIN', photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
    { uid: 'u2', email: 'manager@bento.com', displayName: 'Michael Ross', role: 'APPROVER', projectAuth: ['p1', 'p2'] },
    { uid: 'u3', email: 'user@bento.com', displayName: 'Elena Torres', role: 'USER' },
  ]);

  // Load persistence
  useEffect(() => {
    const savedProjects = localStorage.getItem('bento_projects');
    const savedActivities = localStorage.getItem('bento_activities');
    const savedRequests = localStorage.getItem('bento_requests');
    const savedAlerts = localStorage.getItem('bento_alerts');
    const savedMaster = localStorage.getItem('bento_master_budget');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    else setProjects(INITIAL_PROJECTS);

    if (savedActivities) setActivities(JSON.parse(savedActivities));
    else setActivities(INITIAL_ACTIVITIES);

    if (savedRequests) setRequests(JSON.parse(savedRequests));
    if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
    if (savedMaster) setMasterBudget(Number(savedMaster));
  }, []);

  // Save persistence
  useEffect(() => {
    if (projects.length) localStorage.setItem('bento_projects', JSON.stringify(projects));
    if (activities.length) localStorage.setItem('bento_activities', JSON.stringify(activities));
    localStorage.setItem('bento_requests', JSON.stringify(requests));
    localStorage.setItem('bento_alerts', JSON.stringify(alerts));
    localStorage.setItem('bento_master_budget', masterBudget.toString());
  }, [projects, activities, requests, alerts, masterBudget]);"""

new_states = """  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const projects = useFirestoreCollection<Project>('projects');
  const activities = useFirestoreCollection<SubActivity>('activities');
  const requests = useFirestoreCollection<BudgetRequest>('requests');
  const alerts = useFirestoreCollection<SystemAlert>('alerts');
  const allUsers = useFirestoreCollection<AppUser>('users');
  
  const [masterBudget, setMasterBudget] = useState(2500000);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');"""

content = content.replace(old_states, new_states)

with open('src/App.tsx', 'w') as f:
    f.write(content)
