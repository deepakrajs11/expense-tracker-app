#!/bin/bash

# API Testing Examples for Android SMS SDK
# Make sure the app is running on http://localhost:3000

BASE_URL="http://localhost:3000"
SDK_TOKEN="my-secret-token-123"

echo "=== Android SMS SDK - API Testing ==="
echo ""
echo "Base URL: $BASE_URL"
echo "SDK Token: $SDK_TOKEN"
echo ""

# Test 1: Get accounts without token (should work if no token is set)
echo "1️⃣  Test GET /api/sdk/accounts (no token)"
echo "   Command:"
echo "   curl $BASE_URL/api/sdk/accounts"
echo ""
echo "   Expected: JSON array of accounts"
echo ""

# Test 2: Get accounts with token in header
echo "2️⃣  Test GET /api/sdk/accounts (with header token)"
echo "   Command:"
echo "   curl -H \"x-sdk-token: $SDK_TOKEN\" $BASE_URL/api/sdk/accounts"
echo ""
echo "   Expected: JSON array of accounts"
echo ""

# Test 3: Get accounts with token in query
echo "3️⃣  Test GET /api/sdk/accounts (with query param token)"
echo "   Command:"
echo "   curl \"$BASE_URL/api/sdk/accounts?token=$SDK_TOKEN\""
echo ""
echo "   Expected: JSON array of accounts"
echo ""

# Test 4: Download SDK source
echo "4️⃣  Test GET /api/sdk/download (download SDK source ZIP)"
echo "   Command:"
echo "   curl -o sdk-source.zip \"$BASE_URL/api/sdk/download\""
echo "   unzip -l sdk-source.zip | head -20"
echo ""
echo "   Expected: ZIP file with android-sdk/ directory structure"
echo ""

# Test 5: Download when APK is built
echo "5️⃣  Test GET /api/sdk/download (after building APK)"
echo "   Commands:"
echo "   # Build the APK first"
echo "   cd android-sdk && ./gradlew assembleDebug"
echo ""
echo "   # Then download APK"
echo "   curl -o app-debug.apk \"$BASE_URL/api/sdk/download\""
echo "   file app-debug.apk"
echo ""
echo "   Expected: APK binary file (~5-10MB)"
echo ""

# Test 6: SDK page (public, no login required)
echo "6️⃣  Test SDK Page (Public, No Login Required)"
echo "   URL: $BASE_URL/app/sdk"
echo "   Expected:"
echo "     - SDK title and description"
echo "     - Device detection (Android / Not Android)"
echo "     - Download button"
echo "     - Setup instructions and features"
echo ""

# Test 7: Integration test with curl chain
echo "7️⃣  Integration Test (Full Flow)"
echo "   Commands:"
echo "   # 1. Verify accounts endpoint works"
echo "   curl -s $BASE_URL/api/sdk/accounts | jq ."
echo ""
echo "   # 2. Download SDK source"
echo "   curl -s -o /tmp/sdk.zip \"$BASE_URL/api/sdk/download\""
echo "   ls -lh /tmp/sdk.zip"
echo ""
echo "   # 3. List SDK structure"
echo "   unzip -l /tmp/sdk.zip | head -30"
echo ""

echo ""
echo "=== Interactive Testing ==="
echo ""

# Interactive menu
PS3='Select a test to run (1-7, or q to quit): '
options=("Accounts (no token)" "Accounts (with header token)" "Accounts (with query token)" "Download SDK ZIP" "Download APK (if built)" "View SDK Page" "Full Integration Test" "Quit")

select opt in "${options[@]}"
do
    case $opt in
        "Accounts (no token)")
            echo "Running: curl $BASE_URL/api/sdk/accounts"
            curl "$BASE_URL/api/sdk/accounts" | jq .
            ;;
        "Accounts (with header token)")
            echo "Running: curl -H \"x-sdk-token: $SDK_TOKEN\" $BASE_URL/api/sdk/accounts"
            curl -H "x-sdk-token: $SDK_TOKEN" "$BASE_URL/api/sdk/accounts" | jq .
            ;;
        "Accounts (with query token)")
            echo "Running: curl $BASE_URL/api/sdk/accounts?token=$SDK_TOKEN"
            curl "$BASE_URL/api/sdk/accounts?token=$SDK_TOKEN" | jq .
            ;;
        "Download SDK ZIP")
            echo "Downloading SDK ZIP..."
            curl -s -o /tmp/sdk-download.zip "$BASE_URL/api/sdk/download"
            echo "File saved to /tmp/sdk-download.zip"
            ls -lh /tmp/sdk-download.zip
            echo "Preview:"
            unzip -l /tmp/sdk-download.zip | head -20
            ;;
        "Download APK (if built)")
            echo "Downloading APK..."
            curl -s -o /tmp/app-debug.apk "$BASE_URL/api/sdk/download"
            if file /tmp/app-debug.apk | grep -q "Zip"; then
                echo "✓ APK downloaded successfully"
                ls -lh /tmp/app-debug.apk
            else
                echo "Note: APK not built yet, downloaded source ZIP instead"
                ls -lh /tmp/app-debug.apk
            fi
            ;;
        "View SDK Page")
            echo "Open in browser: $BASE_URL/app/sdk (public, no login required)"
            if command -v xdg-open &> /dev/null; then
                xdg-open "$BASE_URL/app/sdk"
            elif command -v open &> /dev/null; then
                open "$BASE_URL/app/sdk"
            else
                echo "Please manually open: $BASE_URL/app/sdk"
            fi
            ;;
        "Full Integration Test")
            echo "Testing accounts endpoint..."
            curl -s "$BASE_URL/api/sdk/accounts" | jq . && echo "✓ Accounts OK"
            echo ""
            echo "Testing download endpoint..."
            curl -s -o /tmp/integration-test.zip "$BASE_URL/api/sdk/download"
            ls -lh /tmp/integration-test.zip && echo "✓ Download OK"
            echo ""
            echo "Integration test complete!"
            ;;
        "Quit")
            break
            ;;
        *) echo "invalid option $REPLY";;
    esac
done

echo ""
echo "For detailed testing guide, see: TESTING.md"
