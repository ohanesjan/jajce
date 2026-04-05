# Stability backlog

## High priority
- Add lightweight logging for unexpected admin-action errors
- Make Postgres integration tests explicitly opt-in
- Audit FormData.get() defaulting paths for null vs undefined issues

## Medium priority
- Add interactive test for live daily-log total-yield UI
- Review raw SQL insert paths for explicit ID handling consistency

## Completed / resolved
- Explicit opt-in for Postgres integration test runs
- Fixed false admin success->error redirects caused by redirect() inside try/catch
- Fixed daily-log raw SQL insert ID mismatch against DB schema
- Fixed manual cost-entry source_type null/undefined defaulting