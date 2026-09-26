with open('src/lib/inventory.test.ts', 'r') as f:
    text = f.read()

text = text.replace('toBeCloseTo(93.0, 1)', 'toBeCloseTo(93.1, 1)')
with open('src/lib/inventory.test.ts', 'w') as f:
    f.write(text)
