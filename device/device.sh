#!/bin/bash

export MSYS_NO_PATHCONV=1

chmod +x telemetry.sh action_listener.sh

# ./telemetry.sh &
./action_listener.sh &

wait

