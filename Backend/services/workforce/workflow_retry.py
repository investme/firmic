from __future__ import annotations

import datetime

from typing import Any

from sqlalchemy.orm import Session

from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyOrchestrationRun,
)
from models.workforce_job import WorkforceJob


DEFAULT_MAX_WORKFLOW_RETRIES = 3


def _safe_int(
    value: Any,
    *,
    default: int = 0,
) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def orchestration_retry_count(
    run: SonnyOrchestrationRun,
) -> int:
    return max(
        0,
        _safe_int(
            run.retry_count,
            default=0,
        ),
    )


def orchestration_max_retries(
    run: SonnyOrchestrationRun,
) -> int:
    value = _safe_int(
        run.max_retries,
        default=DEFAULT_MAX_WORKFLOW_RETRIES,
    )

    if value < 0:
        return 0

    return value


def orchestration_retry_available(
    run: SonnyOrchestrationRun,
) -> bool:
    """
    retry_count records failures already consumed.

    A retry remains available only while consumed retries are
    below the configured maximum.
    """
    return (
        orchestration_retry_count(run)
        < orchestration_max_retries(run)
    )


def assignment_attempt_count(
    assignment: SonnyAgentAssignment,
) -> int:
    return max(
        0,
        _safe_int(
            assignment.attempt_count,
            default=0,
        ),
    )


def assignment_max_attempts(
    assignment: SonnyAgentAssignment,
) -> int:
    value = _safe_int(
        assignment.max_attempts,
        default=1,
    )

    return max(
        0,
        value,
    )


def assignment_attempt_available(
    assignment: SonnyAgentAssignment,
) -> bool:
    """
    attempt_count is incremented when execution starts.

    Another attempt is available only when the number already
    started is below max_attempts.
    """
    return (
        assignment_attempt_count(assignment)
        < assignment_max_attempts(assignment)
    )


def classify_orchestration_failure(
    run: SonnyOrchestrationRun,
) -> str:
    """
    Classify a failed orchestration run without mutating it.

    retryable:
        Failure budget remains.

    exhausted:
        Configured retry budget has been consumed.

    not_failed:
        Run is not currently in failed state.
    """
    if str(
        run.status or ""
    ).strip().lower() != "failed":
        return "not_failed"

    if orchestration_retry_available(run):
        return "retryable"

    return "exhausted"


def retry_policy_snapshot(
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "run_id": run.id,
        "run_status": run.status,
        "retry_count": orchestration_retry_count(
            run
        ),
        "max_retries": orchestration_max_retries(
            run
        ),
        "retry_available": (
            orchestration_retry_available(
                run
            )
        ),
        "failure_classification": (
            classify_orchestration_failure(
                run
            )
        ),
    }

    if assignment is not None:
        payload.update(
            {
                "assignment_id": assignment.id,
                "assignment_status": (
                    assignment.status
                ),
                "attempt_count": (
                    assignment_attempt_count(
                        assignment
                    )
                ),
                "max_attempts": (
                    assignment_max_attempts(
                        assignment
                    )
                ),
                "attempt_available": (
                    assignment_attempt_available(
                        assignment
                    )
                ),
            }
        )

    return payload


def reopen_failed_execution_for_retry(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    job: WorkforceJob,
    actor_id: str = "sonny",
    commit: bool = True,
) -> dict[str, Any]:
    """
    Reopen one persisted failed execution attempt.

    Canonical retry counters are deliberately NOT reset:

    - run.retry_count remains the number of failed runs
      already consumed.
    - assignment.attempt_count remains the number of
      assignment attempts already started.

    The normal executor will increment attempt_count again
    when the reopened assignment starts its next attempt.
    """

    if str(run.status or "").strip().lower() != "failed":
        raise ValueError(
            "Only failed orchestration runs can be retried."
        )

    if (
        str(
            assignment.status or ""
        ).strip().lower()
        != "failed"
    ):
        raise ValueError(
            "Only failed assignments can be retried."
        )

    if str(job.status or "").strip().lower() != "failed":
        raise ValueError(
            "Only failed workforce jobs can be retried."
        )

    if str(
        assignment.orchestration_run_id
    ) != str(run.id):
        raise ValueError(
            "Assignment does not belong to orchestration run."
        )

    metadata = dict(
        job.metadata_json or {}
    )

    metadata_run_id = metadata.get(
        "orchestration_run_id"
    )

    metadata_assignment_id = metadata.get(
        "assignment_id"
    )

    if (
        metadata_run_id is not None
        and str(metadata_run_id)
        != str(run.id)
    ):
        raise ValueError(
            "Workforce job orchestration linkage mismatch."
        )

    if (
        metadata_assignment_id is not None
        and str(metadata_assignment_id)
        != str(assignment.id)
    ):
        raise ValueError(
            "Workforce job assignment linkage mismatch."
        )

    if not orchestration_retry_available(
        run
    ):
        raise ValueError(
            "Orchestration retry budget is exhausted."
        )

    if not assignment_attempt_available(
        assignment
    ):
        raise ValueError(
            "Assignment attempt budget is exhausted."
        )

    retry_count_before = (
        orchestration_retry_count(
            run
        )
    )

    attempt_count_before = (
        assignment_attempt_count(
            assignment
        )
    )

    now = datetime.datetime.utcnow()

    # --------------------------------------------------------
    # Reopen orchestration lifecycle.
    #
    # retry_count is intentionally preserved.
    # --------------------------------------------------------

    run.status = "approved"
    run.failed_at = None
    run.error_message = None

    if hasattr(
        run,
        "started_at",
    ):
        run.started_at = None

    if hasattr(
        run,
        "completed_at",
    ):
        run.completed_at = None

    if hasattr(
        run,
        "updated_at",
    ):
        run.updated_at = now

    # --------------------------------------------------------
    # Reopen assignment lifecycle.
    #
    # attempt_count is intentionally preserved.
    # --------------------------------------------------------

    assignment.status = "approved"
    assignment.failed_at = None
    assignment.error_message = None

    if hasattr(
        assignment,
        "accepted_at",
    ):
        assignment.accepted_at = None

    if hasattr(
        assignment,
        "started_at",
    ):
        assignment.started_at = None

    if hasattr(
        assignment,
        "completed_at",
    ):
        assignment.completed_at = None

    if hasattr(
        assignment,
        "cancelled_at",
    ):
        assignment.cancelled_at = None

    if hasattr(
        assignment,
        "updated_at",
    ):
        assignment.updated_at = now

    # --------------------------------------------------------
    # Reopen canonical WorkforceJob.
    # --------------------------------------------------------

    job.status = "accepted"
    job.progress = 10
    job.failed_at = None
    job.failure_reason = None

    if hasattr(
        job,
        "completed_at",
    ):
        job.completed_at = None

    if hasattr(
        job,
        "updated_at",
    ):
        job.updated_at = now

    retry_metadata = dict(
        metadata.get(
            "retry"
        )
        or {}
    )

    retry_metadata.update(
        {
            "status": "reopened",
            "actor_id": str(
                actor_id or "sonny"
            ),
            "retry_count": (
                retry_count_before
            ),
            "max_retries": (
                orchestration_max_retries(
                    run
                )
            ),
            "attempt_count": (
                attempt_count_before
            ),
            "max_attempts": (
                assignment_max_attempts(
                    assignment
                )
            ),
            "reopened_at": (
                now.isoformat()
            ),
        }
    )

    metadata["retry"] = (
        retry_metadata
    )

    job.metadata_json = metadata

    # --------------------------------------------------------
    # Counter fencing.
    #
    # A retry reopen MUST NEVER refund a consumed retry or
    # assignment attempt.
    # --------------------------------------------------------

    if (
        orchestration_retry_count(
            run
        )
        != retry_count_before
    ):
        raise RuntimeError(
            "Retry reopening modified retry_count."
        )

    if (
        assignment_attempt_count(
            assignment
        )
        != attempt_count_before
    ):
        raise RuntimeError(
            "Retry reopening modified attempt_count."
        )

    if commit:
        db.commit()
        db.refresh(run)
        db.refresh(assignment)
        db.refresh(job)
    else:
        db.flush()

    return {
        "status": "reopened",
        "run": run,
        "assignment": assignment,
        "job": job,
        "retry_count": (
            orchestration_retry_count(
                run
            )
        ),
        "max_retries": (
            orchestration_max_retries(
                run
            )
        ),
        "attempt_count": (
            assignment_attempt_count(
                assignment
            )
        ),
        "max_attempts": (
            assignment_max_attempts(
                assignment
            )
        ),
    }
