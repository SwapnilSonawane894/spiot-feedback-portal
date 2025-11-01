#!/usr/bin/env zsh

# Exit on error
set -e

echo "🔄 Applying fixes to student task academicYear handling..."

# Backup current file
echo "📦 Creating backup of mongodb-services.ts..."
cp src/lib/mongodb-services.ts src/lib/mongodb-services.ts.bak

# Try to apply the patch
echo "🛠️ Applying patch..."
if ! patch -p1 < patch-student-tasks.patch; then
  echo "❌ Patch failed, restoring backup..."
  mv src/lib/mongodb-services.ts.bak src/lib/mongodb-services.ts
  exit 1
fi

echo "✅ Changes applied successfully!"