import json
from datetime import datetime

finding_path = '/home/joaomarcos/teste-do-mantis/workspace/findings/01-sql-injection-vulnerable-appointment-repository.json'

with open(finding_path, 'r') as f:
    finding = json.load(f)

# Update with reproduction results
finding['repro_status'] = 'reproduced'
finding['repro_file_path'] = 'workspace/reproducers/repro_finding-001.ts'
finding['run_command'] = 'npx tsx workspace/reproducers/repro_finding-001.ts'
finding['repro_output'] = 'Test A: findById (UUID column) - PostgreSQL UUID validation (22P02) blocked injection\nTest B: findByStatus (text column) - SQL INJECTION SUCCESSFUL: Returned appointments of MULTIPLE statuses (PENDING and CONFIRMED)'
finding['repro_snapshot_id'] = 'snap_20250829_01'
finding['repro_hints'] = 'sanitizers_used: none; build_profile: test; assertions_disabled: false; note: findById uses UUID column (22P02 blocks injection); findByStatus uses text column (exploitable); pattern confirmed in text columns (findByStatus, findByCustomerIdAndStatus, findByDateRange)'
finding['history'].append({
    "stage": "reproduce",
    "action": "reproduced",
    "details": "Reproduction status evaluated as reproduced using command: npx tsx workspace/reproducers/repro_finding-001.ts",
    "pass_number": 2,
    "timestamp": datetime.utcnow().isoformat() + "Z"
})

with open(finding_path, 'w') as f:
    json.dump(finding, f, indent=2)

print("Finding updated successfully")