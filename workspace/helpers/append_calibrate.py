# MANTIS_HELPER_VERSION = 2
import json
import sys
import os
from datetime import datetime
from pathlib import Path

def append_calibrate(
    finding_path: str,
    impact_score: int,
    likelihood_score: int,
    availability_tier: str,
    inferred_exposure: str,
    attacker_position: str,
    mantis_risk_score: float,
    priority: str,
    sanity_triage_applied: str,
    calibration_checklist: dict,
    outrage_commentary: str,
    executive_summary: str,
    pass_number: int = 2,
    snapshot: str = "snap_20250829_01"
):
    """Append calibration data to a finding file."""
    
    with open(finding_path, 'r') as f:
        finding = json.load(f)
    
    # Check idempotency - skip if already calibrated for this pass/snapshot
    for entry in finding.get('history', []):
        if entry.get('stage') == 'calibrate' and entry.get('pass_number') == pass_number:
            if entry.get('snapshot') == snapshot:
                print(f"Already calibrated for pass {pass_number}, snapshot {snapshot} - skipping")
                return
    
    # Update fields
    finding['impact_score'] = impact_score
    finding['likelihood_score'] = likelihood_score
    finding['availability_tier'] = availability_tier
    finding['inferred_exposure'] = inferred_exposure
    finding['attacker_position'] = attacker_position
    finding['mantis_risk_score'] = mantis_risk_score
    finding['priority'] = priority
    finding['sanity_triage_applied'] = sanity_triage_applied
    finding['calibration_checklist'] = calibration_checklist
    finding['outrage_commentary'] = outrage_commentary
    finding['executive_summary'] = executive_summary
    
    # Add history entry
    history_entry = {
        "stage": "calibrate",
        "action": "calibrated",
        "details": f"Calculated risk score as {mantis_risk_score} and priority as {priority}.",
        "pass_number": pass_number,
        "snapshot": snapshot,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    finding.setdefault('history', []).append(history_entry)
    
    # Write back
    with open(finding_path, 'w') as f:
        json.dump(finding, f, indent=2)
    
    print(f"Updated {finding_path}: {priority} ({mantis_risk_score})")

if __name__ == "__main__":
    if len(sys.argv) < 12:
        print("Usage: python append_calibrate.py <finding_path> <impact_score> <likelihood_score> <availability_tier> <inferred_exposure> <attacker_position> <mantis_risk_score> <priority> <sanity_triage_applied> <calibration_checklist_json> <outrage_commentary> <executive_summary> [pass_number] [snapshot]")
        sys.exit(1)
    
    finding_path = sys.argv[1]
    impact_score = int(sys.argv[2])
    likelihood_score = int(sys.argv[3])
    availability_tier = sys.argv[4]
    inferred_exposure = sys.argv[5]
    attacker_position = sys.argv[6]
    mantis_risk_score = float(sys.argv[7])
    priority = sys.argv[8]
    sanity_triage_applied = sys.argv[9]
    calibration_checklist = json.loads(sys.argv[10])
    outrage_commentary = sys.argv[11]
    executive_summary = sys.argv[12]
    pass_number = int(sys.argv[13]) if len(sys.argv) > 13 else 2
    snapshot = sys.argv[14] if len(sys.argv) > 14 else "snap_20250829_01"
    
    append_calibrate(finding_path, impact_score, likelihood_score, availability_tier, inferred_exposure, attacker_position, mantis_risk_score, priority, sanity_triage_applied, calibration_checklist, outrage_commentary, executive_summary, pass_number, snapshot)