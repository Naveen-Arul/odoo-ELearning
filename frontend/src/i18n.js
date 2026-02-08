import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
    en: {
        translation: {
            // Navigation
            "nav.dashboard": "Dashboard",
            "nav.roadmaps": "Roadmaps",
            "nav.studyPlan": "Study Plan",
            "nav.languages": "Languages",
            "nav.career": "Career",
            "nav.community": "Community",
            "nav.ai": "AI Tutor",

            // Dashboard
            "dashboard.welcome": "Welcome back",
            "dashboard.todaysPlan": "Today's Plan",
            "dashboard.progress": "Progress",
            "dashboard.streak": "Day Streak",
            "dashboard.weeklyGoal": "Weekly Goal",

            // Common
            "common.loading": "Loading...",
            "common.save": "Save",
            "common.cancel": "Cancel",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.submit": "Submit",
            "common.start": "Start",
            "common.complete": "Complete",

            // Messages
            "msg.success": "Success!",
            "msg.error": "An error occurred",
            "msg.confirmDelete": "Are you sure you want to delete this?"
        }
    },
    ta: {
        translation: {
            // Navigation (Tamil)
            "nav.dashboard": "முகப்பு பக்கம்",
            "nav.roadmaps": "கற்றல் பாதைகள்",
            "nav.studyPlan": "படிப்பு திட்டம்",
            "nav.languages": "மொழிகள்",
            "nav.career": "தொழில்",
            "nav.community": "சமூகம்",
            "nav.ai": "AI ஆசிரியர்",

            // Dashboard (Tamil)
            "dashboard.welcome": "மீண்டும் வரவேற்கிறோம்",
            "dashboard.todaysPlan": "இன்றைய திட்டம்",
            "dashboard.progress": "முன்னேற்றம்",
            "dashboard.streak": "நாள் தொடர்ச்சி",
            "dashboard.weeklyGoal": "வார இலக்கு",

            // Common (Tamil)
            "common.loading": "ஏற்றுகிறது...",
            "common.save": "சேமிக்கவும்",
            "common.cancel": "ரத்து செய்",
            "common.delete": "நீக்கு",
            "common.edit": "திருத்து",
            "common.submit": "சமர்ப்பிக்க",
            "common.start": "தொடங்கு",
            "common.complete": "முடிக்கவும்",

            // Messages (Tamil)
            "msg.success": "வெற்றி!",
            "msg.error": "பிழை ஏற்பட்டது",
            "msg.confirmDelete": "இதை நிச்சயமாக நீக்க விரும்புகிறீர்களா?"
        }
    },
    hi: {
        translation: {
            // Navigation (Hindi)
            "nav.dashboard": "डैशबोर्ड",
            "nav.roadmaps": "सीखने के मार्ग",
            "nav.studyPlan": "अध्ययन योजना",
            "nav.languages": "भाषाएँ",
            "nav.career": "करियर",
            "nav.community": "समुदाय",
            "nav.ai": "AI ट्यूटर",

            // Dashboard (Hindi)
            "dashboard.welcome": "वापसी पर स्वागत है",
            "dashboard.todaysPlan": "आज की योजना",
            "dashboard.progress": "प्रगति",
            "dashboard.streak": "दिन की लकीर",
            "dashboard.weeklyGoal": "साप्ताहिक लक्ष्य",

            // Common (Hindi)
            "common.loading": "लोड हो रहा है...",
            "common.save": "सहेजें",
            "common.cancel": "रद्द करें",
            "common.delete": "हटाएं",
            "common.edit": "संपादित करें",
            "common.submit": "जमा करें",
            "common.start": "शुरू करें",
            "common.complete": "पूर्ण करें",

            // Messages (Hindi)
            "msg.success": "सफलता!",
            "msg.error": "एक त्रुटि हुई",
            "msg.confirmDelete": "क्या आप वाकई इसे हटाना चाहते हैं?"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('skillforge-language') || 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
