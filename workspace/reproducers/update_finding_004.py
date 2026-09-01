import json
from datetime import datetime

finding_path = '/home/joaomarcos/teste-do-mantis/workspace/findings/04-sql-injection-findbystatus.json'

with open(finding_path, 'r') as f:
    finding = json.load(f)

# Update with reproduction results
finding['repro_status'] = 'reproduced'
finding['repro_file_path'] = 'workspace/reproducers/repro_finding-004.ts'
finding['run_command'] = 'npx tsx workspace/reproducers/repro_finding-004.ts'
finding['repro_snapshot_id'] = 'snap_20250829_01'
finding['repro_hints'] = 'sanitizers_used: none; build_profile: test; assertions_disabled: false; note: findByStatus uses text column (exploitable); payload PENDING\' OR \'1\'=\'1\' -- bypasses status filter and returns all appointments'
finding['history'].append({
    "stage": "reproduce",
    "action": "reproduced",
    "details": "Reproduction status evaluated as reproduced using command: npx tsx workspace/reproducers/repro_finding-004.ts",
    "pass_number": 2,
    "timestamp": datetime.utcnow().isoformat() + "Z"
})

with open(finding_path, 'w') as f:
    json.dump(finding, f, indent=2)

print("Finding updated successfully")