import os
from supabase import Client, create_client

""" we could use the supabase client for querying the db tables, 
or use Django's ORM. The ORM seems more complicated and is pretty much a duplicate of the table structure in Supabase
so I think we should go with the Supabase client, which uses python functions to interact with the db - it doesn't require SQL nor ORMs 
"""
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_PUBLISHABLE_KEY"],
)
