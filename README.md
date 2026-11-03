# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## To start the frontend

From the repository root, use Node.js 22.13 or newer:

```bash
npm install                     # First run, or after dependencies change
npm run web -- --port 8081
```

Open http://localhost:8081 in your browser, or http://localhost:8081/signup to test signup. Frontend screens live in `src/app/`.

## To start the backend

#### first-time setup
In a second terminal, start from the repository root. Set up Python dependencies **once**:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install django django-cors-headers python-dotenv supabase
```

Create a `.env` file in the **repository root** (beside `package.json`, not inside `backend/`) with your Supabase project values:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

#### Start Django on port **5000**, matching the frontend signup URL:

```bash
source .venv/bin/activate
python backend/manage.py migrate       # First run, or after Django migrations change
python backend/manage.py runserver 127.0.0.1:5000
```

Keep both terminals running while testing; press `Ctrl+C` in each to stop. These instructions target browser testing on the same computer. CORS is configured for frontend port **8081**.

For signup testing, the Supabase profile-creation trigger must be installed, and `http://localhost:8081/login` must be allowed under **Authentication → URL Configuration → Redirect URLs**. Django migrations initialize its local SQLite tables; they do not install the Supabase trigger.

## Additional information

### Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
