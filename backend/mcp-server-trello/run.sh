#!/bin/bash
cd /Users/clementefalcone/Desktop/personal/emotioxV3
source .env
export TRELLO_API_KEY TRELLO_TOKEN TRELLO_BOARD_ID
exec pnpx @delorenj/mcp-server-trello
