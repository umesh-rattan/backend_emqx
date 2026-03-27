#!/bin/bash

IMEI="860123456789012"
TENANT="revolt"
SEQ=1

while true; do
  TS=$(($(date +%s)*1000))

  mosquitto_pub \
    -h mqtt.revoltmotors.com -p 8883 \
    --cafile ca.pem \
    --cert ${IMEI}.pem \
    --key ${IMEI}.key \
    -i ${IMEI} \
    -u ${IMEI} \
    -q 1 \
    -t "/tenants/${TENANT}/devices/${IMEI}/events/all_data/jsonarray" \
    -m "[
      {
        \"imei\":\"${IMEI}\",
        \"sequence\":${SEQ},
        \"timestamp\":${TS},
        \"speed\":45,
        \"battery_voltage\":3800,
        \"ignition_status\":1
      }
    ]"

  SEQ=$((SEQ+1))
  sleep 10
done