with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("    return <Login onGoogleSignIn={() => handleLogin('admin@bento.com')} onEmailSignIn={handleLogin} />;", "    return <Login />;")

with open('src/App.tsx', 'w') as f:
    f.write(content)
