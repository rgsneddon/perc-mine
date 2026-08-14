"""Standalone perc-mine launcher (no browser). Builds the same argv Connect uses."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

VERSION = "1.0.2"
DEFAULT_POOL = "mineperc.restoreprivacy.online:1466"
DEFAULT_USER = "PERC_USERNAME.WORKER"


def honor_threads(raw) -> int:
    try:
        n = int(raw)
    except (TypeError, ValueError):
        n = 1
    return max(1, min(64, n))


def miner_js_path() -> Path:
    here = Path(__file__).resolve().parent
    exe_dir = Path(sys.executable).resolve().parent
    candidates = [
        here / "miner.js",
        here.parent / "src" / "miner.js",
        exe_dir / "src" / "miner.js",
        exe_dir / "miner.js",
    ]
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.insert(0, Path(meipass) / "src" / "miner.js")
        candidates.insert(0, Path(meipass) / "miner.js")
    for path in candidates:
        if path.is_file():
            return path
    return here / "miner.js"


def node_bin() -> str:
    found = shutil.which("node")
    if found:
        return found
    return "node"


@dataclass
class MinerCommand:
    exe: str
    args: list[str]
    argv_text: str
    threads: int
    version: str = VERSION
    miner_js: str = ""


def build_miner_command(
    pool: str = DEFAULT_POOL,
    user: str = DEFAULT_USER,
    threads: int = 1,
    notls: bool = False,
    node: str | None = None,
    miner_js: Path | None = None,
) -> MinerCommand:
    n = honor_threads(threads)
    js = Path(miner_js or miner_js_path())
    exe = node or node_bin()
    args = [
        str(js),
        "--pool",
        str(pool or DEFAULT_POOL),
        "--user",
        str(user or DEFAULT_USER),
        "--threads",
        str(n),
    ]
    if notls:
        args.append("--notls")
    quoted = [f'"{p}"' if (" " in p) else p for p in [exe, *args]]
    return MinerCommand(
        exe=exe,
        args=args,
        argv_text=" ".join(quoted),
        threads=n,
        miner_js=str(js),
    )


def start_miner_from_gui(settings: dict, popen=subprocess.Popen):
    """Spawn the shipped miner.js. Returns {ok, cmd, child, error}."""
    cmd = build_miner_command(
        pool=settings.get("pool") or DEFAULT_POOL,
        user=settings.get("user") or DEFAULT_USER,
        threads=settings.get("threads") or 1,
        notls=bool(settings.get("notls")),
    )
    if not Path(cmd.miner_js).is_file():
        return {
            "ok": False,
            "cmd": cmd,
            "child": None,
            "error": f"miner.js not found at {cmd.miner_js}",
        }
    if not shutil.which(cmd.exe) and cmd.exe == "node":
        return {
            "ok": False,
            "cmd": cmd,
            "child": None,
            "error": "Node.js 18+ is required on PATH to start perc-mine",
        }
    try:
        child = popen(
            [cmd.exe, *cmd.args],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as err:
        return {"ok": False, "cmd": cmd, "child": None, "error": str(err)}
    return {"ok": True, "cmd": cmd, "child": child, "error": None}


def connect_result(settings: dict, popen=subprocess.Popen) -> dict:
    """Same contract as POST /api/connect: started + command text + error."""
    got = start_miner_from_gui(settings, popen=popen)
    cmd = got["cmd"]
    return {
        "started": bool(got["ok"] and got["child"] is not None),
        "error": got["error"],
        "cmd": {
            "argvText": cmd.argv_text,
            "threads": cmd.threads,
            "exe": cmd.exe,
            "args": cmd.args,
        },
        "child": got["child"],
    }
