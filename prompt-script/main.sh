#!/bin/sh

curl -sN http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What are the top 3 alpinists of all time and what are the highlights of their careers?",
  "stream": true
}' |
  jq -s -r 'map(.response) | join("")'
