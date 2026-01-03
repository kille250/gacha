#!/usr/bin/env python3
"""
Clean up version comments from essenceTap.js config file
"""
import re

input_file = 'backend/config/essenceTap.js'
output_file = 'backend/config/essenceTap.js'

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline version comments (// v3.0: ..., // v4.0: ..., etc.)
# Matches patterns like "  // v3.0: Reduced from 1" at end of lines
content = re.sub(r' *// v[0-9]\.[0-9]:.*$', '', content, flags=re.MULTILINE)

# Also clean up any remaining version comment patterns
content = re.sub(r' *// was .*$', '', content, flags=re.MULTILINE)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Cleaned config file: {output_file}")
print("Removed all inline version comments")
