"""Drive the shipped standalone launcher (Connect path, no browser)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from desktop_launch import (  # noqa: E402
    DEFAULT_POOL,
    build_miner_command,
    connect_result,
    honor_threads,
    miner_js_path,
)


class FakeChild:
    def __init__(self, argv):
        self.argv = argv
        self.stdout = None


class TestDesktopLaunch(unittest.TestCase):
    def test_build_command_includes_pool_user_threads(self) -> None:
        cmd = build_miner_command(
            pool="mineperc.restoreprivacy.online:1466",
            user="gui.w",
            threads=2,
        )
        joined = " ".join(cmd.args)
        self.assertIn("mineperc.restoreprivacy.online:1466", joined)
        self.assertIn("--user", cmd.args)
        self.assertEqual(cmd.args[cmd.args.index("--user") + 1], "gui.w")
        self.assertIn("--threads", cmd.args)
        self.assertEqual(cmd.args[cmd.args.index("--threads") + 1], "2")
        self.assertEqual(cmd.threads, 2)
        self.assertTrue(cmd.miner_js.endswith("miner.js"))
        self.assertTrue(Path(cmd.miner_js).is_file())
        self.assertIn("miner.js", cmd.argv_text)

    def test_connect_result_starts_shipped_miner_entry(self) -> None:
        seen = {}

        def fake_popen(argv, **kwargs):
            seen["argv"] = argv
            seen["kwargs"] = kwargs
            return FakeChild(argv)

        got = connect_result(
            {
                "pool": "mineperc.restoreprivacy.online:1466",
                "user": "gui.w",
                "threads": 3,
            },
            popen=fake_popen,
        )
        self.assertTrue(got["started"])
        self.assertIsNone(got["error"])
        argv = seen["argv"]
        self.assertTrue(str(argv[1]).endswith("miner.js"))
        self.assertIn("--pool", argv)
        self.assertEqual(argv[argv.index("--pool") + 1], DEFAULT_POOL)
        self.assertIn("--user", argv)
        self.assertEqual(argv[argv.index("--user") + 1], "gui.w")
        self.assertIn("--threads", argv)
        self.assertEqual(argv[argv.index("--threads") + 1], "3")
        self.assertIn("mineperc.restoreprivacy.online:1466", got["cmd"]["argvText"])
        self.assertIn("--user", got["cmd"]["argvText"])
        self.assertIn("--threads", got["cmd"]["argvText"])

    def test_missing_miner_is_visible_error(self) -> None:
        def boom(*_a, **_k):
            raise OSError("node not found")

        # honor_threads still used
        self.assertEqual(honor_threads("9"), 9)
        self.assertTrue(miner_js_path().is_file())
        got = connect_result({"pool": DEFAULT_POOL, "user": "x", "threads": 1}, popen=boom)
        self.assertFalse(got["started"])
        self.assertIn("node not found", got["error"] or "")


if __name__ == "__main__":
    unittest.main()
