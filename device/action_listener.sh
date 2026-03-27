#!/bin/bash

IMEI="860123456789012"
TENANT="revolt"

SUB_CLIENT_ID="${IMEI}_action_listener"
PUB_CLIENT_ID="${IMEI}_action_publisher"

mosquitto_sub \
  -h mqtt.revoltmotors.com -p 8883 \
  --cafile ca.pem \
  --cert ${IMEI}.pem \
  --key ${IMEI}.key \
  -i ${SUB_CLIENT_ID} \
  -q 1 \
  -t "/tenants/${TENANT}/devices/${IMEI}/actions" | \
while read -r ACTION; do

  echo "📥 Action received:"
  echo "$ACTION"

  ACTION_ID=$(echo "$ACTION" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  TS=$(($(date +%s)*1000))

  sleep 2

  mosquitto_pub \
    -h mqtt.revoltmotors.com -p 8883 \
    --cafile ca.pem \
    --cert ${IMEI}.pem \
    --key ${IMEI}.key \
    -i ${PUB_CLIENT_ID} \
    -q 1 \
    -t "/tenants/${TENANT}/devices/${IMEI}/action/status" \
    -m "[{
      \"action_id\":\"${ACTION_ID}\",
      \"timestamp\":${TS},
      \"state\":\"Completed\",
      \"progress\":100,
      \"errors\":[]
    }]"

done
