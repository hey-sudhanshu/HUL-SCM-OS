with open('src/lib/inventory.ts', 'r') as f:
    text = f.read()

text = text.replace("import { v4 as uuidv4 } from 'uuid';", "const uuidv4 = () => Math.random().toString(36).substring(7);")
with open('src/lib/inventory.ts', 'w') as f:
    f.write(text)
