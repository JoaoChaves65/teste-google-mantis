# MANTIS_HELPER_VERSION = 2
import json
import sys
import os
from datetime import datetime
from pathlib import Path

def append_critic(
    finding_path: str,
    production_viability: str,
    critic_reasoning: str,
    pass_number: int = 2,
    snapshot: str = "snap_20250829_01"
):
    """Append critic evaluation to a finding file."""
    
    with open(finding_path, 'r') as f:
        finding = json.load(f)
    
    # Check idempotency - skip if already evaluated for this pass/snapshot
    for entry in finding.get('history', []):
        if entry.get('stage') == 'critic' and entry.get('pass_number') == pass_number:
            if entry.get('snapshot') == snapshot:
                print(f"Already evaluated for pass {pass_number}, snapshot {snapshot} - skipping")
                return
    
    # Update fields
    finding['production_viability'] = production_viability
    finding['critic_reasoning'] = critic_reasoning
    
    # Add history entry
    history_entry = {
        "stage": "critic",
        "action": "evaluated",
        "details": f"Determined production viability as {production_viability} because {critic_reasoning}",
        "pass_number": pass_number,
        "snapshot": snapshot,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    finding.setdefault('history', []).append(history_entry)
    
    # Write back
    with open(finding_path, 'w') as f:
        json.dump(finding, f, indent=2)
    
    print(f"Updated {finding_path}: {production_viability}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python append_critic.py <finding_path> <production_viability> <critic_reasoning> [pass_number] [snapshot]")
        sys.exit(1)
    
    finding_path = sys.argv[1]
    production_viability = sys.argv[2]
    critic_reasoning = sys.argv[3]
    pass_number = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    snapshot = sys.argv[5] if len(sys.argv) > 5 else "snap_20250829_01"
    
    append_critic(finding_path, production_viability, critic_reasoning, pass_number, snapshot)