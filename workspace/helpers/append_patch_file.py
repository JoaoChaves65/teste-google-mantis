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
    if len(sys.argv) < 2:
        print("Usage: python append_patch_file.py <args_json_file>")
        sys.exit(1)
    
    args_file = sys.argv[1]
    with open(args_file, 'r') as f:
        args = json.load(f)
    
    append_patch(
        args["finding_path"],
        args["patch_status"],
        args.get("patch_diff", ""),
        args.get("patch_base_snapshot", "snap_20250829_01"),
        args.get("reattack_status", ""),
        args.get("reattack_file_path", ""),
        args.get("reattack_run_command", ""),
        args.get("reattack_output", ""),
        args.get("reattack_variants", []),
        args.get("pass_number", 2)
    )