from __future__ import annotations

from pathlib import Path

class AppRuntimeState:
    def __init__(self) -> None:
        self.base_dir = Path(__file__).resolve().parent.parent


app_state = AppRuntimeState()
