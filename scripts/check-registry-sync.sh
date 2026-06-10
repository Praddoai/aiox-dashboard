#!/bin/bash
# Check if .aios-core/ files changed but registry was not regenerated.
# Used by husky pre-commit hook.

# Get staged files in .aios-core/
AIOS_CHANGES=$(git diff --cached --name-only -- ../.aios-core/ .aios-core/ legacy/.aios-core/ 2>/dev/null)

if [ -n "$AIOS_CHANGES" ]; then
  REGISTRY="src/data/aios-registry.generated.ts"
  REGISTRY_STAGED=$(git diff --cached --name-only -- "$REGISTRY")

  if [ -z "$REGISTRY_STAGED" ]; then
    echo ""
    echo "⚠️  .aios-core/ files changed but registry was not regenerated."
    echo "   Run: npm run generate:registry"
    echo "   Then stage the updated file: git add $REGISTRY"
    echo ""
    echo "Changed .aios-core files:"
    echo "$AIOS_CHANGES" | head -10
    echo ""
    exit 1
  fi
fi
