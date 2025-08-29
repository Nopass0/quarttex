#!/bin/bash
# Test API endpoints

if [ $# -lt 2 ]; then
    echo "Usage: $0 <METHOD> <ENDPOINT> [DATA] [TOKEN]"
    echo "Example: $0 GET /api/health"
    echo "Example: $0 POST /api/merchant/payouts '{\"amount\": 1000}' 'test-token'"
    exit 1
fi

METHOD=$1
ENDPOINT=$2
DATA=${3:-}
TOKEN=${4:-}

# Build full URL
if [[ $ENDPOINT == /* ]]; then
    URL="http://localhost:3000$ENDPOINT"
else
    URL="http://localhost:3000/api/$ENDPOINT"
fi

echo "🔍 Testing: $METHOD $URL"
echo ""

# Build curl command
CURL_CMD="curl -s -X $METHOD $URL"

# Add headers
CURL_CMD="$CURL_CMD -H 'Content-Type: application/json'"

# Add auth token if provided
if [ -n "$TOKEN" ]; then
    # Determine token type based on endpoint
    if [[ $ENDPOINT == *"/admin/"* ]]; then
        CURL_CMD="$CURL_CMD -H 'x-admin-key: $TOKEN'"
    elif [[ $ENDPOINT == *"/merchant/"* ]]; then
        CURL_CMD="$CURL_CMD -H 'x-merchant-api-key: $TOKEN'"
    elif [[ $ENDPOINT == *"/trader/"* ]]; then
        CURL_CMD="$CURL_CMD -H 'x-trader-token: $TOKEN'"
    fi
fi

# Add data if provided
if [ -n "$DATA" ]; then
    CURL_CMD="$CURL_CMD -d '$DATA'"
fi

# Execute and format response
echo "Request:"
echo "$CURL_CMD"
echo ""
echo "Response:"
eval "$CURL_CMD" | jq . 2>/dev/null || eval "$CURL_CMD"
echo ""