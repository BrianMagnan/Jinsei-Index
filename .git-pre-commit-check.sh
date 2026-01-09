#!/bin/bash
# Pre-commit hook to check for missing imports

echo "Checking for missing dependencies..."

# Get list of files being committed
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx$' | grep '\.ts$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Check if any staged file imports something that doesn't exist
MISSING_IMPORTS=0

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    # Extract relative imports (./ or ../)
    IMPORTS=$(grep -E "from ['\"](\.\.?\/)" "$file" | sed "s/.*from ['\"]\(.*\)['\"].*/\1/" | sed 's/\.tsx$//' | sed 's/\.ts$//')
    
    for import in $IMPORTS; do
      # Resolve the import path
      DIR=$(dirname "$file")
      IMPORT_PATH="$DIR/$import"
      
      # Check if file exists (try .tsx, .ts, or /index.tsx, /index.ts)
      if [ ! -f "$IMPORT_PATH.tsx" ] && [ ! -f "$IMPORT_PATH.ts" ] && [ ! -f "$IMPORT_PATH/index.tsx" ] && [ ! -f "$IMPORT_PATH/index.ts" ]; then
        # Check if it's tracked in git
        if ! git ls-files --error-unmatch "$IMPORT_PATH.tsx" "$IMPORT_PATH.ts" "$IMPORT_PATH/index.tsx" "$IMPORT_PATH/index.ts" >/dev/null 2>&1; then
          echo "⚠️  Warning: $file imports '$import' which may not exist or be committed"
          MISSING_IMPORTS=1
        fi
      fi
    done
  fi
done

if [ $MISSING_IMPORTS -eq 1 ]; then
  echo ""
  echo "⚠️  Some imports may be missing. Please verify all imported files are committed."
  echo "   Run 'git status' to see untracked files."
  read -p "Continue with commit? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

exit 0
