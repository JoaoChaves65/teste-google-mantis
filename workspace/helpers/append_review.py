# MANTIS_HELPER_VERSION = 2
import json
import sys
import os
from datetime import datetime
from pathlib import Path

def append_review(
    finding_path: str,
    status: str,
    reasoning: str,
    repro_hints: str = "",
    triage_checklist: dict = None,
    pass_number: int = 2,
    snapshot: str = "snap_20250829_01"
):
    """Append reviewer history entry to a finding file."""
    
    with open(finding_path, 'r') as f:
        finding = json.load(f)
    
    # Check idempotency - skip if already reviewed for this pass/snapshot
    for entry in finding.get('history', []):
        if entry.get('stage') == 'reviewer' and entry.get('pass_number') == pass_number:
            if entry.get('snapshot') == snapshot:
                print(f"Already reviewed for pass {pass_number}, snapshot {snapshot} - skipping")
                return
    
    # Update status
    finding['status'] = status
    finding['reasoning'] = reasoning
    if repro_hints:
        finding['repro_hints'] = repro_hints
    if triage_checklist:
        finding['triage_checklist'] = triage_checklist
    
    # Add history entry
    history_entry = {
        "stage": "reviewer",
        "action": "reviewed",
        "details": f"Determined status as {status} because {reasoning}",
        "pass_number": pass_number,
        "snapshot": snapshot,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    finding.setdefault('history', []).append(history_entry)
    
    # Write back
    with open(finding_path, 'w') as f:
        json.dump(finding, f, indent=2)
    
    print(f"Updated {finding_path}: {status}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python append_review.py <finding_path> <status> <reasoning> <triage_checklist_json> [repro_hints] [pass_number] [snapshot]")
        sys.exit(1)
    
    finding_path = sys.argv[1]
    status = sys.argv[2]
    reasoning = sys.argv[3]
    triage_checklist = json.loads(sys.argv[4])
    repro_hints = sys.argv[5] if len(sys.argv) > 5 else ""
    pass_number = int(sys.argv[6]) if len(sys.argv) > 6 else 2
    snapshot = sys.argv[7] if len(sys.argv) > 7 else "snap_20250829_01"
    
    append_review(finding_path, status, reasoning, repro_hints, triage_checklist, pass_number, snapshot)