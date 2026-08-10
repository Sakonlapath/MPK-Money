import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

def replace_between(content, start_str, end_str, new_str):
    start = content.find(start_str)
    if start == -1: return content
    end = content.find(end_str, start)
    if end == -1: return content
    return content[:start] + start_str + new_str + content[end:]

# handleLogin -> signOut
login_code = """  const handleLogin = (email: string) => {
    const user = allUsers.find(u => u.email === email) || allUsers[2];
    setCurrentUser(user);
    setActiveTab('dashboard');
  };"""
new_login_code = """  const handleLogout = async () => {
    await signOut(auth);
  };"""
content = content.replace(login_code, new_login_code)

with open('src/App.tsx', 'w') as f:
    f.write(content)
