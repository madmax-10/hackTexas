# ⚡ Quick Start Guide - AI Interview Coach

## 🚀 **Start the Full Application in 2 Minutes**

### **Prerequisites**
- Python 3.10+ installed
- Node.js 16+ installed
- Redis running (for WebSocket features)

---

## 🎯 **Option 1: Start Both Servers**

### **Terminal 1: Backend**
```bash
cd /Users/yugeshbhattarai/Downloads/Programming/hackathon1
source venv/bin/activate
python manage.py runserver
```

### **Terminal 2: Frontend**
```bash
cd /Users/yugeshbhattarai/Downloads/Programming/hackathon1-frontend
npm run dev
```

### **Open in Browser**
Frontend: `http://localhost:5173`
Backend API: `http://localhost:8000/api`

---

## 🎯 **Option 2: One-Command Start** (Coming Soon)

Create a simple bash script to start both:

```bash
# create start.sh
#!/bin/bash

# Start backend
cd hackathon1
source venv/bin/activate
python manage.py runserver &

# Start frontend
cd ../hackathon1-frontend
npm run dev &

# Wait for both
wait
```

---

## 🎮 **Try It Out!**

### **1. Landing Page**
- ✅ Visit `http://localhost:5173`
- ✅ See 5 interview demo options
- ✅ Select "Software Engineer Interview"
- ✅ Click "Start Interview Practice"

### **2. Upload Resume**
- ✅ Drag & drop any image file
- ✅ Or click "Browse Files"
- ✅ Click "Generate Interview Questions"
- ✅ Wait 2-3 seconds for AI processing

### **3. Answer Questions**
- ✅ Read the first question
- ✅ Type your answer (or copy sample text)
- ✅ Click "Get Live Feedback" (optional)
- ✅ Click "Next" to continue
- ✅ Complete all 5 questions
- ✅ Click "Submit & Get Report"

### **4. View Report**
- ✅ See your overall scores
- ✅ Read detailed feedback
- ✅ Review tips for improvement
- ✅ Print report or practice again

---

## 🎤 **Sample Answers** (for quick testing)

Copy these if you want to test quickly:

**Question 1:**
```
I have 5 years of experience as a software engineer, specializing in full-stack development with Python, Django, React, and PostgreSQL. I've led multiple projects from conception to deployment.
```

**Question 2:**
```
In my previous role, I architected and implemented a microservices platform that improved system performance by 40% and reduced deployment time by 60%. I led a team of 4 developers through the entire process.
```

**Question 3:**
```
I believe in open communication and collaboration. I hold daily stand-ups, use agile methodologies, and maintain clear documentation. I'm always available to help team members and value their input.
```

**Question 4:**
```
I have 5 years of professional experience with Python and Django. I've built RESTful APIs, implemented authentication systems, optimized database queries, and deployed applications to AWS.
```

**Question 5:**
```
I start by clearly defining the problem, researching possible solutions, breaking it down into smaller tasks, implementing incrementally with tests, and iterating based on feedback.
```

---

## 🔧 **Troubleshooting**

### **Backend not responding?**
```bash
# Check if port 8000 is in use
lsof -i:8000

# Kill existing process
kill -9 <PID>

# Restart server
python manage.py runserver
```

### **Frontend not loading?**
```bash
# Check if port 5173 is in use
lsof -i:5173

# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### **CORS errors?**
- Make sure backend is running
- Check API_BASE_URL in `src/services/api.js`
- Backend should be at `http://localhost:8000`

### **Database errors?**
```bash
cd hackathon1
python manage.py migrate
python manage.py populate_demos
```

---

## 🎨 **What You'll See**

### **Landing Page**
- Purple gradient background
- 5 glassmorphism demo cards
- "How It Works" section
- Start button

### **Resume Upload**
- Drag-and-drop zone
- Image preview
- Progress indicator
- Beautiful animations

### **Interview Page**
- Progress bar
- Question cards
- Text area for answers
- Word counter
- Live feedback button
- Navigation controls

### **Report Page**
- Overall score cards
- Detailed per-question analysis
- Progress bars
- Feedback sections
- Tips for improvement

---

## 📊 **System Check**

### **Backend Health**
```bash
curl http://localhost:8000/api/demos/
```
Should return JSON with 5 demos.

### **Frontend Health**
Visit `http://localhost:5173`
Should see landing page.

---

## 🎯 **Demo Flow (60 seconds)**

1. **0:00** - Open `http://localhost:5173`
2. **0:05** - Select "Software Engineer Interview"
3. **0:10** - Upload any image file
4. **0:15** - Wait for questions to generate
5. **0:20** - Type/paste answer for question 1
6. **0:25** - Click "Get Live Feedback" (see instant analysis)
7. **0:30** - Click "Next" to question 2
8. **0:35** - Type/paste answers for questions 2-5
9. **0:50** - Click "Submit & Get Report"
10. **0:55** - View comprehensive analysis!

---

## 🎉 **You're Ready!**

Everything is set up and working. Start both servers and experience the full AI Interview Coach application!

**Tips:**
- Use real answers for better feedback
- Try the live feedback feature
- Check all your scores
- Print the report for reference

**Happy interviewing! 🚀**
