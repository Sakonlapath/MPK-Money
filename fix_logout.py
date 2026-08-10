with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("onLogout={() => setCurrentUser(null)}", "onLogout={handleLogout}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
