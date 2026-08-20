from __future__ import annotations

import logging
import os
import signal
import socket
import time
import uuid
from dataclasses import dataclass
from threading import Event
from typing import Any

from database import SessionLocal
from services.sonny.workflow_leases import (
    DEFAULT_WORKFLOW_LEASE_SECONDS,
)
from services.workforce.workflow_dispatcher import (
    DEFAULT_DISPATCH_MAX_STEPS,
    dispatch_next_workflow,
    dispatch_result_summary,
)


logger = logging.getLogger(
    __name__
)


DEFAULT_WORKFLOW_POLL_SECONDS = 5.0

MIN_WORKFLOW_POLL_SECONDS = 0.25
MAX_WORKFLOW_POLL_SECONDS = 300.0

MIN_WORKFLOW_LEASE_SECONDS = 5
MAX_WORKFLOW_LEASE_SECONDS = 3600

MIN_WORKFLOW_MAX_STEPS = 1
MAX_WORKFLOW_MAX_STEPS = 100


@dataclass(frozen=True)
class WorkflowWorkerConfig:
    worker_id: str
    poll_seconds: float
    lease_seconds: int
    max_steps: int
    company_id: str | None
    actor_id: str


def _clean(
    value: Any,
) -> str:
    return str(
        value or ""
    ).strip()


def _read_float_env(
    name: str,
    *,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    raw = _clean(
        os.getenv(
            name
        )
    )

    if not raw:
        value = float(
            default
        )
    else:
        try:
            value = float(
                raw
            )
        except ValueError as exc:
            raise ValueError(
                f"{name} must be numeric."
            ) from exc

    if value < minimum:
        raise ValueError(
            f"{name} must be >= {minimum}."
        )

    if value > maximum:
        raise ValueError(
            f"{name} must be <= {maximum}."
        )

    return value


def _read_int_env(
    name: str,
    *,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    raw = _clean(
        os.getenv(
            name
        )
    )

    if not raw:
        value = int(
            default
        )
    else:
        try:
            value = int(
                raw
            )
        except ValueError as exc:
            raise ValueError(
                f"{name} must be an integer."
            ) from exc

    if value < minimum:
        raise ValueError(
            f"{name} must be >= {minimum}."
        )

    if value > maximum:
        raise ValueError(
            f"{name} must be <= {maximum}."
        )

    return value


def derive_worker_id() -> str:
    """
    Prefer an explicit deployment-provided worker identity.

    Otherwise derive a process-stable ID from host + pid + a
    process-local random suffix.

    The value is generated once when configuration loads and
    remains stable for the life of this worker process.
    """

    configured = _clean(
        os.getenv(
            "FIRMIC_WORKFLOW_WORKER_ID"
        )
    )

    if configured:
        return configured

    host = (
        _clean(
            socket.gethostname()
        )
        or "unknown-host"
    )

    pid = os.getpid()

    suffix = uuid.uuid4().hex[
        :12
    ]

    return (
        f"firmic-workflow-worker:"
        f"{host}:"
        f"{pid}:"
        f"{suffix}"
    )


def load_worker_config() -> WorkflowWorkerConfig:
    worker_id = derive_worker_id()

    poll_seconds = _read_float_env(
        "FIRMIC_WORKFLOW_POLL_SECONDS",
        default=DEFAULT_WORKFLOW_POLL_SECONDS,
        minimum=MIN_WORKFLOW_POLL_SECONDS,
        maximum=MAX_WORKFLOW_POLL_SECONDS,
    )

    lease_seconds = _read_int_env(
        "FIRMIC_WORKFLOW_LEASE_SECONDS",
        default=DEFAULT_WORKFLOW_LEASE_SECONDS,
        minimum=MIN_WORKFLOW_LEASE_SECONDS,
        maximum=MAX_WORKFLOW_LEASE_SECONDS,
    )

    max_steps = _read_int_env(
        "FIRMIC_WORKFLOW_MAX_STEPS",
        default=DEFAULT_DISPATCH_MAX_STEPS,
        minimum=MIN_WORKFLOW_MAX_STEPS,
        maximum=MAX_WORKFLOW_MAX_STEPS,
    )

    company_id = (
        _clean(
            os.getenv(
                "FIRMIC_WORKFLOW_COMPANY_ID"
            )
        )
        or None
    )

    actor_id = (
        _clean(
            os.getenv(
                "FIRMIC_WORKFLOW_ACTOR_ID"
            )
        )
        or "sonny"
    )

    return WorkflowWorkerConfig(
        worker_id=worker_id,
        poll_seconds=poll_seconds,
        lease_seconds=lease_seconds,
        max_steps=max_steps,
        company_id=company_id,
        actor_id=actor_id,
    )


class WorkflowWorker:
    """
    Single-process production workflow worker.

    Important ownership boundaries:

    - exactly one dispatcher call is active at a time;
    - each dispatch uses a fresh SessionLocal instance;
    - the dispatcher owns workflow leases;
    - the executor/orchestration layers own retry counters;
    - this worker never mutates execution rows directly;
    - shutdown is cooperative between dispatch iterations.
    """

    def __init__(
        self,
        config: WorkflowWorkerConfig,
    ) -> None:
        self.config = config
        self.stop_event = Event()

    def request_stop(
        self,
    ) -> None:
        self.stop_event.set()

    def handle_signal(
        self,
        signum: int,
        _frame: Any,
    ) -> None:
        logger.info(
            "workflow_worker_stop_requested",
            extra={
                "worker_id": (
                    self.config.worker_id
                ),
                "signal": signum,
            },
        )

        self.request_stop()

    def install_signal_handlers(
        self,
    ) -> None:
        signal.signal(
            signal.SIGTERM,
            self.handle_signal,
        )

        signal.signal(
            signal.SIGINT,
            self.handle_signal,
        )

    def dispatch_once(
        self,
    ) -> dict[str, Any]:
        """
        Execute exactly one dispatcher iteration.

        A fresh DB session is always created and always closed.
        """

        db = SessionLocal()

        try:
            result = dispatch_next_workflow(
                db,
                worker_id=(
                    self.config.worker_id
                ),
                lease_seconds=(
                    self.config.lease_seconds
                ),
                max_steps=(
                    self.config.max_steps
                ),
                company_id=(
                    self.config.company_id
                ),
                actor_id=(
                    self.config.actor_id
                ),
            )

            return result

        finally:
            db.close()

    def _sleep_until_next_poll(
        self,
    ) -> None:
        """
        Event.wait() is used instead of raw time.sleep() so a
        shutdown signal can interrupt idle waiting immediately.
        """

        self.stop_event.wait(
            self.config.poll_seconds
        )

    def run(
        self,
    ) -> int:
        self.install_signal_handlers()

        logger.info(
            "workflow_worker_started",
            extra={
                "worker_id": (
                    self.config.worker_id
                ),
                "poll_seconds": (
                    self.config.poll_seconds
                ),
                "lease_seconds": (
                    self.config.lease_seconds
                ),
                "max_steps": (
                    self.config.max_steps
                ),
                "company_id": (
                    self.config.company_id
                ),
                "actor_id": (
                    self.config.actor_id
                ),
            },
        )

        while not self.stop_event.is_set():
            try:
                result = self.dispatch_once()

                summary = (
                    dispatch_result_summary(
                        result
                    )
                )

                logger.info(
                    "workflow_worker_dispatch",
                    extra={
                        "worker_id": (
                            self.config.worker_id
                        ),
                        **summary,
                    },
                )

                status = _clean(
                    result.get(
                        "status"
                    )
                ).lower()

                if status == "idle":
                    self._sleep_until_next_poll()

            except KeyboardInterrupt:
                self.request_stop()

            except Exception:
                logger.exception(
                    "workflow_worker_iteration_failed",
                    extra={
                        "worker_id": (
                            self.config.worker_id
                        ),
                    },
                )

                if not self.stop_event.is_set():
                    self._sleep_until_next_poll()

        logger.info(
            "workflow_worker_stopped",
            extra={
                "worker_id": (
                    self.config.worker_id
                ),
            },
        )

        return 0


def configure_logging() -> None:
    level = (
        _clean(
            os.getenv(
                "FIRMIC_WORKFLOW_LOG_LEVEL"
            )
        )
        or "INFO"
    ).upper()

    logging.basicConfig(
        level=getattr(
            logging,
            level,
            logging.INFO,
        ),
        format=(
            "%(asctime)s "
            "%(levelname)s "
            "%(name)s "
            "%(message)s"
        ),
    )


def main() -> int:
    configure_logging()

    config = (
        load_worker_config()
    )

    worker = WorkflowWorker(
        config
    )

    return worker.run()


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
