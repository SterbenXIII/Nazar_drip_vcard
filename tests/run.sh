#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
bash "$SCRIPT_DIR/test_remote_deployment.sh"
bash "$SCRIPT_DIR/test_clinic_vps_deployment_contract.sh"
