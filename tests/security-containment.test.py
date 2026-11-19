#!/usr/bin/env python3
"""Static regression checks for the temporary fail-closed containment patch."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FailClosedContainmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = (ROOT / "server.ts").read_text()
        cls.storage = (ROOT / "src/lib/storage.ts").read_text()
        cls.app = (ROOT / "src/App.tsx").read_text()
        cls.modal = (ROOT / "src/components/AuthModal.tsx").read_text()
        cls.deploy = (ROOT / ".github/workflows/deploy.yml").read_text()
        cls.apk = (ROOT / ".github/workflows/build-apk.yml").read_text()

    def test_api_gate_precedes_every_api_route(self):
        gate = self.server.index("app.use('/api'")
        first_route = min(self.server.index(f"app.{verb}('") for verb in ("get", "post", "put", "delete"))
        self.assertLess(gate, first_route)
        self.assertIn("res.status(503)", self.server[gate:first_route])
        paths = re.findall(r"app\.(?:get|post|put|delete)\(['\"]([^'\"]+)", self.server)
        self.assertTrue(paths)
        self.assertTrue(all(path.startswith('/api/') or path == '*' for path in paths))

    def test_demo_admin_seed_and_automatic_db_initialization_removed(self):
        self.assertNotIn("getInitialDbData", self.server)
        self.assertNotIn("Florencia Amor (Admin)", self.server)
        self.assertNotIn("Florencia Amor (Admin)", self.storage)
        self.assertNotRegex(self.server, r"(?i)password\s*:\s*['\"`]")
        self.assertNotRegex(self.storage, r"(?i)password\s*[:=]\s*['\"`]")
        read_region = self.server[self.server.index("function readDb()"):self.server.index("function writeDb(data: any)")]
        self.assertNotIn("writeFileSync", read_region)
        self.assertIn("automatic initialization is disabled", self.server)

    def test_local_sensitive_storage_and_client_identity_removed(self):
        self.assertNotIn("localStorage", self.storage)
        self.assertNotIn("localStorage", self.app)
        self.assertNotIn("stream_control_user", self.app)
        self.assertIn("useState<User | null>(null)", self.app)

    def test_ui_warns_and_does_not_collect_credentials(self):
        self.assertIn("no ingreses credenciales reales", self.modal.lower())
        self.assertIn("temporalmente deshabilitado", self.modal.lower())
        self.assertNotIn('type="password"', self.modal)
        self.assertNotIn('type="email"', self.modal)

    def test_workflows_remain_gated_to_production_branch_names(self):
        self.assertIn("github.ref == 'refs/heads/main'", self.deploy)
        self.assertIn("github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'", self.apk)


if __name__ == "__main__":
    unittest.main(verbosity=2)
