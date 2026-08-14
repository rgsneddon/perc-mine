#!/usr/bin/env python3
"""perc-mine 1.0.2 standalone desktop app — tkinter, not a browser."""

from __future__ import annotations

import threading
import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from desktop_launch import (
    DEFAULT_POOL,
    DEFAULT_USER,
    VERSION,
    build_miner_command,
    connect_result,
)


class PercMineApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(f"perc-mine {VERSION}")
        self.geometry("720x560")
        self.minsize(560, 420)
        self.configure(bg="#0b0d14")
        self.child = None
        self._build()
        self._refresh_command()

    def _build(self) -> None:
        pad = {"padx": 16, "pady": 4}
        ttk.Label(self, text=f"perc-mine {VERSION}").pack(anchor="w", **pad)
        ttk.Label(self, text="Perccent CPU miner · standalone app · Connect starts the miner").pack(
            anchor="w", padx=16
        )

        ttk.Label(self, text="Pool").pack(anchor="w", padx=16, pady=(12, 0))
        self.pool = tk.StringVar(value=DEFAULT_POOL)
        ttk.Entry(self, textvariable=self.pool).pack(fill="x", padx=16)

        ttk.Label(self, text="Perc user").pack(anchor="w", padx=16, pady=(10, 0))
        self.user = tk.StringVar(value=DEFAULT_USER)
        ttk.Entry(self, textvariable=self.user).pack(fill="x", padx=16)

        ttk.Label(self, text="Threads").pack(anchor="w", padx=16, pady=(10, 0))
        self.threads = tk.StringVar(value="2")
        ttk.Entry(self, textvariable=self.threads, width=8).pack(anchor="w", padx=16)

        ttk.Label(self, text="Miner command").pack(anchor="w", padx=16, pady=(10, 0))
        self.command = tk.Text(self, height=3, wrap="word")
        self.command.pack(fill="x", padx=16)

        self.go = ttk.Button(self, text="Connect", command=self._toggle)
        self.go.pack(fill="x", padx=16, pady=12)

        self.log = ScrolledText(self, height=14, wrap="word", bg="#080b12", fg="#00d4aa")
        self.log.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        self._append("Ready. Connect starts perc-mine against the pool above.")

        self.pool.trace_add("write", lambda *_: self._refresh_command())
        self.user.trace_add("write", lambda *_: self._refresh_command())
        self.threads.trace_add("write", lambda *_: self._refresh_command())

    def _refresh_command(self) -> None:
        cmd = build_miner_command(
            pool=self.pool.get(),
            user=self.user.get(),
            threads=self.threads.get(),
        )
        self.command.delete("1.0", "end")
        self.command.insert("1.0", cmd.argv_text)

    def _append(self, line: str) -> None:
        self.log.insert("end", line.rstrip() + "\n")
        self.log.see("end")

    def _toggle(self) -> None:
        if self.child and self.child.poll() is None:
            self.child.terminate()
            self.child = None
            self.go.configure(text="Connect")
            self._append("stopped")
            return
        got = connect_result(
            {
                "pool": self.pool.get(),
                "user": self.user.get(),
                "threads": self.threads.get(),
            }
        )
        if not got["started"]:
            self._append("error " + str(got.get("error") or "failed"))
            return
        self.child = got["child"]
        self.go.configure(text="Stop")
        self._append("started " + got["cmd"]["argvText"])
        threading.Thread(target=self._pump, daemon=True).start()

    def _pump(self) -> None:
        child = self.child
        if not child or not child.stdout:
            return
        for line in child.stdout:
            self.after(0, self._append, line)
        code = child.wait()
        self.after(0, self._append, f"miner exit {code}")
        self.after(0, lambda: self.go.configure(text="Connect"))
        self.child = None


def main() -> None:
    app = PercMineApp()
    app.mainloop()


if __name__ == "__main__":
    main()
