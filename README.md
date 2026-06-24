
# Challan Track

A modern web application built with Google AI Studio to track, analyze, and manage challans using Gemini.

## 🚀 Live Deployment

View the live application on AI Studio: [Launch App](https://ai.studio)

## 🛠️ Prerequisites

Ensure you have the following installed on your local machine:
* **Node.js** (v18.0.0 or higher recommended)
* **npm** (comes packaged with Node)

## 💻 Local Development

Follow these steps to get your local development environment running:

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd challan-track
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   * Open the `.env.local` file in your root directory.
   * Add your Gemini API key:
     ```env
     GEMINI_API_KEY=your_actual_api_key_here
     ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the local server address provided in your terminal.

## 📦 Production Deployment

This application is ready to be deployed to cloud hosting platforms.

### 🌐 Deploying to Vercel (Recommended)
1. Push your project code to a GitHub repository.
2. Import the repository into your [Vercel Dashboard](https://vercel.com).
3. In the **Environment Variables** setup section, add:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: *Your Gemini API Key*
4. Click **Deploy**.

### 🔒 Environment Security
* Never commit your `.env.local` file to GitHub.
* Ensure `.env.local` is listed inside your `.gitignore` file.
* Always use the production platform's dashboard settings to securely store API keys.
