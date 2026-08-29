# MANTIS_HELPER_VERSION = 2
import json
import sys
import os
import hashlib
import uuid
from datetime import datetime
from pathlib import Path

def create_chain_finding(
    chain_id: str,
    title: str,
    description: str,
    impact: str,
    severity: str,
    privileges_required: str,
    user_interaction: str,
    code_paths: list,
    attacker_position: str,
    mitigation: str,
    constituent_findings: list,
    constituent_signatures: list,
    discovery_commit: str,
    pass_number: int = 2
):
    """Create a new exploit chain finding file."""
    
    # Compute chain signature
    if all(sig for sig in constituent_signatures):
        sorted_sigs = sorted(constituent_signatures)
        chain_input = "chain|" + "|".join(sorted_sigs)
        chain_signature = hashlib.sha256(chain_input.encode()).hexdigest()[:16]
    else:
        chain_signature = ""
    
    # Determine lineage_id by scanning archives
    lineage_id = str(uuid.uuid4())
    archive_dirs = [
        "/home/joaomarcos/teste-do-mantis/workspace/archive/findings_pass_*",
        "/home/joaomarcos/teste-do-mantis/workspace/archive/loop*_findings"
    ]
    for archive_pattern in archive_dirs:
        import glob
        for archive_path in glob.glob(archive_pattern):
            if os.path.isdir(archive_path):
                for f in glob.glob(os.path.join(archive_path, "*.json")):
                    try:
                        archived = json.load(open(f))
                        if archived.get("signature") == chain_signature and chain_signature:
                            lineage_id = archived.get("lineage_id", lineage_id)
                            break
                    except:
                        pass
    
    # Determine discovery_commit for chain
    if discovery_commit == "MIXED":
        chain_discovery_commit = "MIXED"
    else:
        chain_discovery_commit = discovery_commit
    
    # Determine production_viability and repro_status
    production_viability = "SAMPLE_OR_TEST"  # All constituents are SAMPLE_OR_TEST
    repro_status = "not_attempted"  # Chain reproduction not attempted
    
    finding = {
        "id": chain_id,
        "title": title,
        "description": description,
        "impact": impact,
        "severity": severity,
        "privileges_required": privileges_required,
        "user_interaction": user_interaction,
        "code_paths": code_paths,
        "attacker_position": attacker_position,
        "mitigation": mitigation,
        "status": "VALID",
        "production_viability": production_viability,
        "repro_status": repro_status,
        "constituent_findings": constituent_findings,
        "signature": chain_signature,
        "lineage_id": lineage_id,
        "discovery_commit": chain_discovery_commit,
        "history": [
            {
                "stage": "chainer",
                "action": "created",
                "details": f"Constructed by chaining findings {', '.join(constituent_findings)}.",
                "pass_number": pass_number,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        ]
    }
    
    # Write file
    output_path = f"/home/joaomarcos/teste-do-mantis/workspace/findings/{chain_id}.json"
    with open(output_path, 'w') as f:
        json.dump(finding, f, indent=2)
    
    print(f"Created chain finding: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_chain.py <chain_config_json>")
        sys.exit(1)
    
    config = json.loads(sys.argv[1])
    create_chain_finding(**config)