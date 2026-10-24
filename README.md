# ScanShield
Email Guard is an AI-powered email fraud detection system that automates phishing analysis using n8n, Threat Intelligence APIs, Large Language Models, and a Streamlit dashboard.
# 🛡️ Email Guard: AI-Powered Email Fraud Detection

Email Guard is an automated security pipeline built for [Name of Hackathon]. It actively monitors incoming emails, runs them through heuristic threat intelligence checks and AI analysis, and generates real-time risk reports on a web dashboard to protect users from phishing, social engineering, and fraud.

## ✨ Key Features
*   **Automated Monitoring:** Connects to Gmail via OAuth2 to securely scan new messages without exposing user passwords.
*   **Threat Intelligence Integration:** Verifies extracted URLs against external databases (like Google Safe Browsing or VirusTotal).
*   **AI Contextual Analysis:** Uses LLMs to analyze email text for impersonation, urgency-based manipulation, and credential theft.
*   **Algorithmic Risk Scoring:** Calculates a 0-100 risk score based on combined evidence (Threat matches + AI confidence + Authentication failures).
*   **Real-Time Dashboard & Alerts:** Sends user warnings for suspicious emails and logs all analysis to a local Streamlit dashboard.

## 🏗️ Architecture Stack
*   **Automation Engine:** n8n (Visual Node-Based Automation)
*   **Web Dashboard & API:** Python (Streamlit, FastAPI)
*   **Integrations:** Gmail API, [Insert LLM API like OpenAI/Gemini], Google Safe Browsing API

## 🚀 Setup and Installation

### 1. Python Dashboard Setup
1. Clone this repository:
   ```bash
   git clone [https://github.com/yourusername/Email-Guard.git](https://github.com/yourusername/Email-Guard.git)
   cd Email-Guard
