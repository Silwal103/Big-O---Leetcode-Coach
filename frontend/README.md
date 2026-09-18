# LeetCode Coach frontend

The frontend is a React/Vite app that can run in two modes:

- A normal local web app at `http://localhost:5173`.
- A Chrome/Chromium Manifest V3 side panel that imports context from the active LeetCode tab.

## Local web app

```powershell
npm install
npm run dev
```

## Browser side panel

1. Start the FastAPI backend from `backend`:

   ```powershell
   .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
   ```

2. Build the frontend:

   ```powershell
   npm run build
   ```

3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose `frontend\dist`.
6. Open a LeetCode problem and click the LeetCode Coach extension action.
7. Use **Refresh tab** in the side panel to import the problem and editor context.

The panel keeps imported fields editable because LeetCode's page structure and editor
implementation can change. The Gemini API key remains in the backend `.env` file and
is never sent to the extension.

## Validation

```powershell
npm run lint
npm run build
```
