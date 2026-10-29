import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .supabase_client import supabase
from django.shortcuts import render #might not be needed


@csrf_exempt
@require_http_methods(["POST"])
def signup(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "error": "Request body must be valid JSON"
        }, status=400)
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    #this is where you check pw/username constraints 
    if not name or not email or not password:
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
                "data": {
                    "name": name,
                }
            }
        })

        user = response.user
        session = response.session

        return JsonResponse({
            "user": {
                "id": user.id if user else None,
                "email": user.email if user else email,
            },
            "session": {
                "access_token": session.access_token,
                #this is a concern on the frontend, but just wanted to note here
                # if session token is Null, the user acount is created but they need to confirm their email, so they're not signed in yet
                # it's still a successful signup, so no further action needed here (you can delete this comment after reading)
                "refresh_token": session.refresh_token,
            } if session else None,
        }, status=201)

    except Exception as error:
        print(f"Signup error: {error}")

        return JsonResponse({
            "error": f"Unable to create account: {error}"
        }, status=400)


#Example 1
# get a list of projects (i.e. select all rows in a table)
# test: curl http://127.0.0.1:5000/projects
@require_http_methods(["GET"])
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