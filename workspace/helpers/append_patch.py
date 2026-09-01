# MANTIS_HELPER_VERSION = 2
import json
import sys
import os
from datetime import datetime
from pathlib import Path

def append_patch(
    finding_path: str,
    patch_status: str,
    patch_diff: str = "",
    patch_base_snapshot: str = "snap_20250829_01",
    reattack_status: str = "",
    reattack_file_path: str = "",
    reattack_run_command: str = "",
    reattack_output: str = "",
    reattack_variants: list = None,
    pass_number: int = 2
):
    """Append patch data to a finding file."""
    
    with open(finding_path, 'r') as f:
        finding = json.load(f)
    
    # Check idempotency - skip if already patched for this pass/snapshot
    for entry in finding.get('history', []):
        if entry.get('stage') == 'patch' and entry.get('pass_number') == pass_number:
            if entry.get('snapshot') == patch_base_snapshot:
                print(f"Already patched for pass {pass_number}, snapshot {patch_base_snapshot} - skipping")
                return
    
    # Update fields
    finding['patch_status'] = patch_status
    if patch_diff:
        finding['patch_diff'] = patch_diff
    finding['patch_base_snapshot'] = patch_base_snapshot
    
    if reattack_status:
        finding['reattack_status'] = reattack_status
    if reattack_file_path:
        finding['reattack_file_path'] = reattack_file_path
    if reattack_run_command:
        finding['reattack_run_command'] = reattack_run_command
    if reattack_output:
        finding['reattack_output'] = reattack_output
    if reattack_variants:
        finding['reattack_variants'] = reattack_variants
    
    # Add history entry
    history_entry = {
        "stage": "patch",
        "action": "patched",
        "details": f"Patch status evaluated as {patch_status} on snapshot {patch_base_snapshot}",
        "pass_number": pass_number,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    finding.setdefault('history', []).append(history_entry)
    
    # Write back
    with open(finding_path, 'w') as f:
        json.dump(finding, f, indent=2)
    
    print(f"Updated {finding_path}: {patch_status}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python append_patch.py <finding_path> <patch_status> [patch_diff] [patch_base_snapshot] [reattack_status] [reattack_file_path] [reattack_run_command] [reattack_output] [reattack_variants_json] [pass_number]")
        sys.exit(1)
    
    finding_path = sys.argv[1]
    patch_status = sys.argv[2]
    patch_diff = sys.argv[3] if len(sys.argv) > 3 else ""
    patch_base_snapshot = sys.argv[4] if len(sys.argv) > 4 else "snap_20250829_01"
    reattack_status = sys.argv[5] if len(sys.argv) > 5 else ""
    reattack_file_path = sys.argv[6] if len(sys.argv) > 6 else ""
    reattack_run_command = sys.argv[7] if len(sys.argv) > 7 else ""
    reattack_output = sys.argv[8] if len(sys.argv) > 8 else ""
    reattack_variants = json.loads(sys.argv[9]) if len(sys.argv) > 9 else []
    pass_number = int(sys.argv[10]) if len(sys.argv) > 10 else 2
    
    append_patch(finding_path, patch_status, patch_diff, patch_base_snapshot, reattack_status, reattack_file_path, reattack_run_command, reattack_output, reattack_variants, pass_number)