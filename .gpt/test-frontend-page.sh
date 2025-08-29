#!/bin/bash
# Test frontend page rendering

if [ $# -lt 1 ]; then
    echo "Usage: $0 <PAGE_PATH>"
    echo "Example: $0 /admin/payouts"
    exit 1
fi

PAGE=$1
URL="http://localhost:3001$PAGE"

echo "🌐 Testing frontend page: $URL"
echo ""

# Check if page loads
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Page loads successfully (200 OK)"
    
    # Check for React errors
    PAGE_CONTENT=$(curl -s $URL)
    
    if echo "$PAGE_CONTENT" | grep -q "Error:"; then
        echo "❌ Page contains errors"
        echo "$PAGE_CONTENT" | grep -A 5 "Error:"
    else
        echo "✅ No visible errors"
    fi
    
    # Check for hydration errors
    if echo "$PAGE_CONTENT" | grep -q "Hydration failed"; then
        echo "❌ Hydration errors detected"
    else
        echo "✅ No hydration errors"
    fi
    
elif [ "$RESPONSE" = "404" ]; then
    echo "❌ Page not found (404)"
elif [ "$RESPONSE" = "500" ]; then
    echo "❌ Server error (500)"
    echo "Check frontend logs: tail -n 50 /tmp/frontend.log"
else
    echo "❌ Unexpected response: $RESPONSE"
fi

echo ""