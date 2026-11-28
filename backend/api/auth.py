import os
from functools import wraps

from django.http import JsonResponse
from supabase import ClientOptions, create_client
from supabase_auth.errors import AuthApiError


def unauthorized():
    response = JsonResponse({"error": "Please sign in with a valid access token."}, status=401)
    response["WWW-Authenticate"] = "Bearer"
    return response


def require_supabase_user(view):
    """Verify a bearer token before running the view; does not check ownership."""
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        parts = request.headers.get("Authorization", "").split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return unauthorized()

        try:
            client = create_client(
                os.environ["SUPABASE_URL"],
                os.environ["SUPABASE_PUBLISHABLE_KEY"],
                options=ClientOptions(persist_session=False, auto_refresh_token=False),
            )
            result = client.auth.get_user(parts[1])
        except AuthApiError as error:
            if str(error.status) in ("401", "403"):
                return unauthorized()
            return JsonResponse({"error": "Authentication is temporarily unavailable."}, status=503)
        except Exception:
            return JsonResponse({"error": "Authentication is temporarily unavailable."}, status=503)

        if result.user is None:
            return unauthorized()

        request.supabase_user = result.user
        return view(request, *args, **kwargs)

    return wrapped
