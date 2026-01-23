# Known issues — PMO console

## Node `DEP0180` deprecation warning (non-blocking)
- Trigger: `npm run build` and `npm run pmo:validate`
- Symptoms: Node prints `DEP0180: fs.Stats constructor is deprecated.`
- Impact: none observed; build/validate succeed.
- Tracking: address when updating Node/tooling, or when the warning becomes an error in future Node releases.
