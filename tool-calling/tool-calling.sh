#!/bin/sh

MODEL="${1:-qwen2.5:7b}"
QUERY="What time is it right now?"

echo "Query: $QUERY"
echo ""

# Step 1: Build and send initial request with tool definitions
REQ1=$(jq -n \
  --arg model "$MODEL" \
  --arg query "$QUERY" \
  '{
    model: $model,
    stream: false,
    messages: [
      {role: "user", content: $query}
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_current_time",
          description: "Get the current date and time",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ]
  }')

if [ -n "$DEBUG" ]; then
  echo "→ Request 1:"
  echo "$REQ1" | jq
  echo ""
fi

RESPONSE=$(echo "$REQ1" | curl -s http://localhost:11434/api/chat -d @-)

if [ -n "$DEBUG" ]; then
  echo "→ Response 1:"
  echo "$RESPONSE" | jq
  echo ""
fi

# Step 2: Check if a tool was called
TOOL_NAME=$(echo "$RESPONSE" | jq -r '.message.tool_calls[0].function.name // empty')

if [ -z "$TOOL_NAME" ]; then
  echo "$RESPONSE" | jq -r '.message.content'
  exit 0
fi

echo "→ Tool call: $TOOL_NAME"

# Step 3: Execute the tool
TOOL_RESULT=$(date)
echo "→ Tool result: $TOOL_RESULT"
echo ""

# Step 4: Build and send follow-up request with tool result
REQ2=$(echo "$RESPONSE" | jq \
  --arg model "$MODEL" \
  --arg query "$QUERY" \
  --arg result "$TOOL_RESULT" \
  '{
    model: $model,
    stream: false,
    messages: [
      {role: "user", content: $query},
      .message,
      {role: "tool", content: $result}
    ]
  }')

if [ -n "$DEBUG" ]; then
  echo "→ Request 2:"
  echo "$REQ2" | jq
  echo ""
fi

TMPFILE=$(mktemp)
echo "$REQ2" | curl -s http://localhost:11434/api/chat -d @- > "$TMPFILE"

if [ -n "$DEBUG" ]; then
  echo "→ Response 2:"
  jq '.' "$TMPFILE"
  echo ""
fi

jq -r '.message.content' "$TMPFILE"
rm "$TMPFILE"
