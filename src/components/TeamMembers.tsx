import React from 'react';
import { AppUser, Project, SubActivity } from '../types';
import { UserCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface TeamMembersProps {
  users: AppUser[];
  projects: Project[];
  activities: SubActivity[];
}

export default function TeamMembers({ users, projects, activities }: TeamMembersProps) {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1e3a8a]">ทีมและผู้รับผิดชอบ</h2>
          <p className="text-slate-500 mt-1 font-bold text-sm">ข้อมูลบุคลากรและโครงการที่รับผิดชอบ</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {users.filter(user => {
          if (user.role !== 'USER') return true;
          const managedProjects = projects.filter(p => p.managerId === user.uid);
          const responsibleActivities = activities.filter(a => a.responsiblePersonIds?.includes(user.uid));
          return managedProjects.length > 0 || responsibleActivities.length > 0;
        }).map((user, idx) => {
          // Find projects managed by this user
          const managedProjects = projects.filter(p => p.managerId === user.uid);
          
          // Find activities responsible by this user
          const responsibleActivities = activities.filter(a => a.responsiblePersonIds?.includes(user.uid));
          
          return (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-md transition-shadow"
            >
              <div className="w-24 h-24 rounded-full bg-slate-100 mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group-hover:scale-105 transition-transform">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 size={48} className="text-slate-400" />
                )}
              </div>
              <h3 className="text-xl font-black text-[#1e3a8a]">{user.displayName}</h3>
              <p className="text-xs text-slate-500 font-bold mb-3">{user.email}</p>
              
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                user.role === 'APPROVER' ? 'bg-emerald-50 text-emerald-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {user.role}
              </span>

              {user.role !== 'ADMIN' && (
                <div className="w-full mt-6 pt-6 border-t border-slate-50 text-left">
                  {managedProjects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">โครงการที่จัดการ</p>
                      <ul className="space-y-1">
                        {managedProjects.map(p => (
                          <li key={p.id} className="text-sm font-bold text-slate-700 truncate">• {p.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {responsibleActivities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">โครงการที่รับผิดชอบ</p>
                      <div className="space-y-2">
                        {Object.entries(
                          responsibleActivities.reduce((acc, a) => {
                            if (!acc[a.projectId]) acc[a.projectId] = [];
                            acc[a.projectId].push(a);
                            return acc;
                          }, {} as Record<string, typeof responsibleActivities>)
                        ).map(([projectId, acts]) => {
                          const proj = projects.find(p => p.id === projectId);
                          return (
                            <details key={projectId} className="group bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                              <summary className="text-sm font-bold text-[#1e3a8a] cursor-pointer list-none flex items-center justify-between p-3 hover:bg-slate-100 transition-colors">
                                <span className="truncate pr-4 leading-tight">{proj?.name || 'โครงการไม่ทราบชื่อ'}</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </span>
                              </summary>
                              <ul className="px-3 pb-3 pt-1 space-y-1.5 bg-white border-t border-slate-100">
                                {acts.map(a => (
                                  <li key={a.id} className="text-xs font-bold text-slate-600 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-emerald-400 leading-tight">
                                    {a.name}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {managedProjects.length === 0 && responsibleActivities.length === 0 && (
                    <p className="text-xs text-slate-400 font-bold text-center py-2">ยังไม่มีโครงการหรือกิจกรรมที่รับผิดชอบ</p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
