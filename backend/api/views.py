import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from supabase import create_client, ClientOptions
from supabase_auth.errors import AuthApiError
from .supabase_client import supabase
from .auth import require_supabase_user
from django.shortcuts import render #might not be needed
FRONTEND_LOGIN_URL = "http://localhost:8081/login"


@csrf_exempt
@require_http_methods(["POST"])
def signup(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "error": "Request body must be valid JSON"
        }, status=400)
    
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    #this is where you check pw/username constraints 
    if not first_name or not email or not password:
        return JsonResponse({
            "error": "Name, email, and password are required"
        }, status=400)

    if len(password) < 8:
        return JsonResponse({
            "error": "Password must be at least 8 characters"
        }, status=400)

    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "email_redirect_to": FRONTEND_LOGIN_URL,
                "data": {
                    "first_name": first_name,
                    "last_name": last_name,
                }
            }
        })

        session = response.session

        return JsonResponse({
            "message": (
                "Signup processed. Check your email for confirmation."
                if session is None
                else "Signup processed. You can now sign in."
            ),
            "requires_email_confirmation": session is None,
        }, status=201)

    except Exception as error:
        print(f"Signup error: {error}")

        return JsonResponse({
            "error": f"Unable to create account: {error}"
        }, status=400)



import os

from supabase import create_client, ClientOptions
from supabase_auth.errors import AuthApiError


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    email = data.get("email")
    password = data.get("password")

    if (
        not isinstance(email, str)
        or not email.strip()
        or not isinstance(password, str)
        or not password
    ):
        return JsonResponse(
            {"error": "Email and password are required."},
            status=400,
        )

    try:
        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_PUBLISHABLE_KEY"],
            options=ClientOptions(
                persist_session=False,
                auto_refresh_token=False,
            ),
        )

        result = client.auth.sign_in_with_password({
            "email": email.strip().lower(),
            "password": password,
        })

        if result.session is None:
            return JsonResponse(
                {"error": "Unable to establish a session."},
                status=401,
            )

        response = JsonResponse({
            "session": {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
            },
        })
        response["Cache-Control"] = "no-store"
        return response

    except AuthApiError as error:
        if getattr(error, "code", None) == "email_not_confirmed":
            return JsonResponse(
                {"error": "Confirm your email before signing in."},
                status=403,
            )

        return JsonResponse(
            {"error": "Unable to sign in. Check your credentials and try again."},
            status=401,
        )

    except Exception:
        return JsonResponse(
            {"error": "Sign-in is temporarily unavailable."},
            status=503,
        )
    


#Example 1
# get a list of projects (i.e. select all rows in a table)
# test: curl http://127.0.0.1:5000/projects
@require_http_methods(["GET"])
@require_supabase_user
def projects(request):
    try:
        response = (
            supabase
            .table("project")
            .select("*")
            .execute()
        )

        return JsonResponse({
            "projects": response.data
        })

    except Exception as error:
        print(f"Project query error: {error}")

        return JsonResponse({
            "error": "Unable to load projects"
        }, status=500)


#Example 2
#filter for a specific row. in this case, we're filtering by the project name, and a field called is_active, which just determines if this is an active project or not
#both are columns (fields) I created in the supabase table named "project"
# test: curl "http://localhost:5000/projects/search?name=tets%20project%204"
@require_http_methods(["GET"])
@require_supabase_user
def active_project_by_name(request):
    project_name = request.GET.get("name", "").strip()

    if not project_name:
        return JsonResponse({
            "error": "The name query parameter is required"
        }, status=400)

    try:
        response = (
            supabase
            .table("project")
            .select("*")
            .eq("project_name", project_name)
            .eq("is_active", True) #see, you can stack filters to query, instead of writing SQL scripts or ORM queries
            .limit(1) #you can indicate a limit to return only 1 result, or specify another number
            .execute()
        )

        return JsonResponse({
            "projects": response.data
        })

    except Exception as error:
        print(f"Project query error: {error}")

        return JsonResponse({
            "error": "Unable to search projects"
        }, status=500)
