# Branch Strategy

- `main`: always deployable and protected.
- `feature/*`: short-lived branches (< 3 days), merged via PR.
- `hotfix/*`: emergency production fixes with expedited review.

## Deployment Guardrails

- Canary rollout at 5% for 30 minutes.
- Automatic rollback when error rate exceeds 1%.
- Production promotion only after canary health check passes.
