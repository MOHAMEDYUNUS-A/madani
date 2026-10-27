import os
import re

TARGET_DIR = r"c:\Users\niran\Desktop\Madani\frontend\app"

REPLACEMENTS = [
    (r"selection:text-indigo-900", r"selection:text-emerald-900"),
    (r"ring-indigo-500/20", r"ring-emerald-500/20"),
    (r"ring-indigo-500", r"ring-[#15803D]"),
    (r"focus:ring-indigo-500", r"focus:ring-[#15803D]"),
    (r"accent-indigo-600", r"accent-[#15803D]"),
    (r"bg-indigo-650", r"bg-[#15803D]"),
    (r"text-indigo-650", r"text-[#15803D]"),
    (r"text-indigo-750", r"text-[#14532D]"),
    (r"hover:text-indigo-650", r"hover:text-[#15803D]"),
    (r"border-indigo-400", r"border-[#4ADE80]"),
    (r"bg-indigo-600", r"bg-[#15803D]"),
    (r"shadow-indigo-600/15", r"shadow-emerald-600/15"),
    (r"from-indigo-900 via-indigo-950 to-slate-900", r"from-[#14532D] via-emerald-950 to-slate-900"),
    (r"border-indigo-400/30", r"border-[#4ADE80]/30"),
    (r"text-indigo-300", r"text-[#4ADE80]"),
    (r"text-indigo-200", r"text-emerald-200"),
]

modified_files = []

for root, _, files in os.walk(TARGET_DIR):
    for f in files:
        if f.endswith((".tsx", ".ts", ".css")):
            filepath = os.path.join(root, f)
            with open(filepath, "r", encoding="utf-8") as fp:
                content = fp.read()
            
            orig = content
            for pattern, replacement in REPLACEMENTS:
                content = re.sub(pattern, replacement, content)
            
            if content != orig:
                with open(filepath, "w", encoding="utf-8") as fp:
                    fp.write(content)
                modified_files.append(filepath)

print(f"Updated {len(modified_files)} files.")
for mf in modified_files:
    print(f" - {mf}")
