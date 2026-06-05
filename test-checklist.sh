#!/bin/bash

# Quick testing checklist for Android SMS SDK integration
# Run this after setting up the environment

set -e

echo "=== Android SMS SDK Testing Checklist ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Dependencies installed
echo -n "1. Checking Node.js dependencies... "
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓ Done${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
  echo "   Run: npm install"
  exit 1
fi

# Check 2: Android SDK directory exists
echo -n "2. Checking Android SDK directory... "
if [ -d "android-sdk" ]; then
  echo -e "${GREEN}✓ Found${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
  exit 1
fi

# Check 3: API route exists
echo -n "3. Checking SDK API routes... "
if [ -f "app/api/sdk/accounts/route.ts" ] && [ -f "app/api/sdk/download/route.ts" ]; then
  echo -e "${GREEN}✓ Found${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
  exit 1
fi

# Check 4: Dashboard page exists
echo -n "4. Checking dashboard page... "
if [ -f "app/dashboard/sdk/page.tsx" ]; then
  echo -e "${GREEN}✓ Found${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
  exit 1
fi

# Check 5: CI workflow exists
echo -n "5. Checking GitHub Actions workflow... "
if [ -f ".github/workflows/build_sdk.yml" ]; then
  echo -e "${GREEN}✓ Found${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
fi

echo ""
echo "=== Quick Start ==="
echo ""
echo "Step 1: Start database"
echo "  $ docker-compose up -d"
echo ""
echo "Step 2: Run migrations"
echo "  $ npm run db:migrate"
echo ""
echo "Step 3: Start dev server"
echo "  $ npm run dev"
echo "  → http://localhost:3000/app/dashboard/sdk"
echo ""
echo "Step 4: Build Android SDK"
echo "  $ cd android-sdk && ./gradlew assembleDebug"
echo ""
echo "Step 5: Test API endpoints"
echo "  $ curl http://localhost:3000/api/sdk/accounts"
echo "  $ curl http://localhost:3000/api/sdk/download -o sdk.zip"
echo ""
echo "Step 6: Install APK on device/emulator"
echo "  $ adb install android-sdk/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "For detailed testing guide, see: TESTING.md"
echo ""
