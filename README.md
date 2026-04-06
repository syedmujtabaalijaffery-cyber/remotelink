# 🚀 RemoteLink – Deployment Guide

## How It Works
- **You (User A)** → Open the app → Generate a link → Share with User B
- **User B** → Opens the link → Sees only [❌ DENY] [✅ ALLOW] buttons
- **User B clicks ALLOW** → You get full screen view and control of their device
- **User B's screen stays normal** → They have no idea you are watching

---

## 📁 Project Structure
```
remoteapp/
├── server/
│   └── index.js        ← Main server (Node.js)
├── client/
│   ├── host/
│   │   └── index.html  ← Your interface (User A)
│   └── remote/
│       └── index.html  ← User B sees this (only 2 buttons)
├── package.json
└── README.md
```

---

## 🛠️ STEP 1 – Install Node.js

1. Go to: https://nodejs.org
2. Download **LTS version**
3. Install it on your computer
4. Open Terminal / Command Prompt and type:
   ```
   node --version
   ```
   You should see something like: `v20.x.x`

---

## 🛠️ STEP 2 – Install Dependencies

Open Terminal inside the `remoteapp` folder and run:
```bash
npm install
```
Wait for it to finish.

---

## 🛠️ STEP 3 – Deploy on Render (FREE – Recommended)

### A. Upload to GitHub first:
1. Go to https://github.com and create a free account
2. Create a new repository called `remotelink`
3. Upload all your project files there

### B. Deploy on Render:
1. Go to https://render.com and sign up free
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in these settings:
   - **Name**: remotelink
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
5. Click **"Create Web Service"**
6. Wait 2-3 minutes
7. You get a link like: `https://remotelink.onrender.com`

✅ **Done! Your app is live!**

---

## 🛠️ STEP 4 – How to Use It

### You (User A):
1. Open: `https://remotelink.onrender.com`
2. Click **"Generate Access Link"**
3. Copy the link shown
4. Send it to User B (via WhatsApp, email, etc.)

### User B:
1. Opens the link on their laptop/phone
2. Sees only two buttons: **[❌ DENY]** and **[✅ ALLOW]**
3. Clicks **[✅ ALLOW]**

### You (User A) – After Allow:
1. A popup appears asking you to confirm
2. Click **[✅ ALLOW]**
3. Browser asks for **screen share permission** – click Allow
4. You now see User B's screen and can control it!

---

## ⚠️ Important Notes

- Works best on **Google Chrome** or **Microsoft Edge**
- Both users need a **stable internet connection**
- Screen sharing requires HTTPS (Render provides this automatically)
- Always use with the other person's **knowledge and consent**

---

## 🔧 Run Locally (For Testing)

```bash
# In the remoteapp folder:
node server/index.js

# Open in browser:
http://localhost:3000
```

---

## 🌐 Alternative Free Deployment Options

| Platform | Free Plan | Link |
|----------|-----------|------|
| Render   | ✅ Yes    | render.com |
| Railway  | ✅ Yes    | railway.app |
| Cyclic   | ✅ Yes    | cyclic.sh |
| Fly.io   | ✅ Yes    | fly.io |

---

## ❓ Troubleshooting

**Screen share not working?**
→ Use Chrome or Edge browser. Firefox has limited support.

**Connection not establishing?**
→ Both users must be on HTTPS (not localhost for remote users)

**User B can't open the link?**
→ Make sure your app is deployed and the link is correct

**Render app sleeping?**
→ Free tier sleeps after 15 min inactivity. First load may take 30 seconds.
