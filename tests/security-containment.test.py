#!/usr/bin/env python3
"""Static security/contract regressions; never read Firestore or data/db.json."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FirebaseContainmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = (ROOT / "server.ts").read_text()
        cls.storage = (ROOT / "src/lib/storage.ts").read_text()
        cls.adapter = (ROOT / "src/lib/firebaseAdapter.ts").read_text()
        cls.app = (ROOT / "src/App.tsx").read_text()
        cls.modal = (ROOT / "src/components/AuthModal.tsx").read_text()
        cls.deploy = (ROOT / ".github/workflows/deploy.yml").read_text()
        cls.apk = (ROOT / ".github/workflows/build-apk.yml").read_text()

    def test_legacy_api_remains_fail_closed(self):
        gate = self.server.index("app.use('/api'")
        body_parser = self.server.index("app.use(express.json")
        self.assertLess(gate, body_parser)
        gate_block = self.server[gate:body_parser]
        self.assertIn("res.status(503)", gate_block)
        self.assertIn("res.status(503).json(", gate_block)
        self.assertNotIn("next(", gate_block)
        routes = list(re.finditer(r"app\.(?:get|post|put|delete)\(['\"]([^'\"]+)", self.server))
        self.assertTrue(routes)
        self.assertLess(gate, routes[0].start())

    def test_firebase_is_explicitly_opt_in_and_project_pinned(self):
        self.assertIn("VITE_FIREBASE_ENABLED === 'true'", self.adapter)
        self.assertIn("VITE_FIREBASE_PROJECT_ID === 'stream-flow-pro'", self.adapter)
        self.assertIn("VITE_FIREBASE_APP_ID", self.adapter)
        self.assertIn("VITE_FIREBASE_ENABLED=false", (ROOT / ".env.example").read_text())

    def test_owner_uid_comes_from_authenticated_session(self):
        self.assertIn("m.auth.getAuth(m.app).currentUser?.uid", self.adapter)
        self.assertIn("'users', uid, collectionNames[collection]", self.adapter)
        self.assertIn("record.userId !== uid", self.adapter)
        self.assertNotIn("/api/", self.storage)
        self.assertNotIn("tokens_usados", self.adapter)

    def test_plaintext_credentials_are_rejected(self):
        self.assertIn("assertNoPlaintextCredentials(safeRecord)", self.adapter)
        self.assertIn("accountToShared", self.adapter)
        self.assertIn("saleToShared", self.adapter)
        self.assertIn("accountpassword", self.adapter.lower())
        self.assertIn("masterpin", self.adapter.lower())
        self.assertIn("Firebase Auth", (ROOT / "docs/FIREBASE_DATA_CONTRACT.md").read_text())

    def test_auth_ui_only_collects_credentials_when_explicitly_enabled(self):
        self.assertIn("!enabled", self.modal)
        self.assertIn('type="password"', self.modal)
        self.assertIn("onLogin(email, password)", self.modal)
        self.assertIn("subscribeToAuth(setUser)", self.app)

    def test_no_seed_admin_or_client_secret_literals(self):
        self.assertNotIn("Florencia Amor (Admin)", self.server)
        self.assertNotRegex(self.server, r"(?i)password\s*:\s*['\"`]")
        self.assertNotRegex(self.storage, r"(?i)password\s*[:=]\s*['\"`]")

    def test_workflows_remain_gated_from_production_deploy(self):
        self.assertIn("github.ref == 'refs/heads/main'", self.deploy)
        self.assertIn("github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'", self.apk)


if __name__ == "__main__":
    unittest.main(verbosity=2)
