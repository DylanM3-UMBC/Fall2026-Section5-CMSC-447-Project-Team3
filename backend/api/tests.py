from types import SimpleNamespace
from unittest.mock import patch

from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase
from supabase_auth.errors import AuthApiError

from .auth import require_supabase_user


class RequestAuthenticationTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch("api.auth.create_client")
    def test_missing_or_malformed_headers_do_not_run_view(self, create_client):
        @require_supabase_user
        def view(request):
            self.fail("Unauthenticated request reached the view")

        for header in ("", "Basic abc", "Bearer", "Bearer a b"):
            with self.subTest(header=header):
                response = view(self.factory.get("/projects", HTTP_AUTHORIZATION=header))
                self.assertEqual(response.status_code, 401)
        create_client.assert_not_called()

    @patch("api.auth.create_client")
    def test_valid_token_attaches_verified_user(self, create_client):
        user = SimpleNamespace(id="verified-user")
        create_client.return_value.auth.get_user.return_value = SimpleNamespace(user=user)

        @require_supabase_user
        def view(request):
            self.assertIs(request.supabase_user, user)
            return JsonResponse({"ok": True})

        response = view(self.factory.get("/projects", HTTP_AUTHORIZATION="Bearer test-token"))
        self.assertEqual(response.status_code, 200)
        create_client.return_value.auth.get_user.assert_called_once_with("test-token")

    @patch("api.auth.create_client")
    def test_failed_verification_blocks_view(self, create_client):
        @require_supabase_user
        def view(request):
            self.fail("Failed verification reached the view")

        for failure, status in (
            (AuthApiError("Invalid token", 401, "bad_jwt"), 401),
            (AuthApiError("Expired token", 403, "jwt_expired"), 401),
            (AuthApiError("Unavailable", 500, "unexpected_failure"), 503),
            (ConnectionError("Offline"), 503),
        ):
            with self.subTest(status=status, failure=str(failure)):
                create_client.return_value.auth.get_user.side_effect = failure
                response = view(self.factory.get("/projects", HTTP_AUTHORIZATION="Bearer test-token"))
                self.assertEqual(response.status_code, status)

    def test_project_endpoints_require_auth_but_login_and_signup_are_public(self):
        for path in ("/projects", "/projects/search?name=test"):
            self.assertEqual(self.client.get(path).status_code, 401)
        for path in ("/signup", "/login"):
            # Empty credentials reach each public view's validation.
            self.assertEqual(self.client.post(path, {}, content_type="application/json").status_code, 400)
