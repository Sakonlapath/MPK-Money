import { AppUser, BudgetRequest, SubActivity } from './types';

export function getResponsiblePersonName(req: BudgetRequest, users: AppUser[], activities: SubActivity[]): string {
  if (req.responsiblePersonId) {
    const user = users.find(u => u.uid === req.responsiblePersonId);
    if (user) return user.displayName;
  }
  
  // Fallback for older requests that don't have responsiblePersonId
  if (activities && activities.length > 0) {
    const activity = activities.find(a => a.id === req.activityId);
    if (activity && activity.responsiblePersonIds && activity.responsiblePersonIds.length > 0) {
      // If there's only one responsible person, assume it's them
      if (activity.responsiblePersonIds.length === 1) {
        const user = users.find(u => u.uid === activity.responsiblePersonIds![0]);
        if (user) return user.displayName;
      } else {
        // If there are multiple, try to find a user whose current or past name matches req.responsiblePerson
        // As a simple heuristic, if one of the responsible users' current displayName matches the old string, use it.
        // If not, we just show all their names.
        const responsibleUsers = users.filter(u => activity.responsiblePersonIds!.includes(u.uid));
        if (responsibleUsers.length > 0) {
          const exactMatch = responsibleUsers.find(u => u.displayName === req.responsiblePerson);
          if (exactMatch) return exactMatch.displayName;
          
          return responsibleUsers.map(u => u.displayName).join(', ');
        }
      }
    }
  }
  
  // Final fallback
  if (req.responsiblePerson === 'AJ.Mam') return 'นางวิทชรียา ทองผาย';
  return req.responsiblePerson || 'ไม่ระบุ';
}

export function getResponsibleUsers(req: BudgetRequest, users: AppUser[], activities: SubActivity[]): AppUser[] {
  if (req.responsiblePersonId) {
    const user = users.find(u => u.uid === req.responsiblePersonId);
    if (user) return [user];
  }
  
  if (activities && activities.length > 0) {
    const activity = activities.find(a => a.id === req.activityId);
    if (activity && activity.responsiblePersonIds && activity.responsiblePersonIds.length > 0) {
      if (activity.responsiblePersonIds.length === 1) {
        const user = users.find(u => u.uid === activity.responsiblePersonIds![0]);
        if (user) return [user];
      } else {
        const responsibleUsers = users.filter(u => activity.responsiblePersonIds!.includes(u.uid));
        if (responsibleUsers.length > 0) {
          const exactMatch = responsibleUsers.find(u => u.displayName === req.responsiblePerson);
          if (exactMatch) return [exactMatch];
          return responsibleUsers;
        }
      }
    }
  }
  
  // Try to find by string name
  const nameMatch = users.find(u => u.displayName === req.responsiblePerson);
  if (nameMatch) return [nameMatch];
  
  return [];
}
