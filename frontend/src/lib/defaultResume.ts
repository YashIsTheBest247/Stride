/**
 * Persistent default-resume slot, browser-local — with a built-in fallback.
 *
 * There is a hard-coded BUILTIN_DEFAULT_LATEX that ships in the bundle, so the
 * "Default" button works on a fresh browser / the deployed app with nothing
 * saved. Users can still override it: paste their own LaTeX → "Save as default"
 * persists it to localStorage (key `stride:default-latex`) for that browser,
 * and that override is what loads from then on. Saving an empty value clears
 * the override and falls back to the built-in again.
 *
 * The saved override stays in the browser — never sent to the backend.
 */
const KEY = "stride:default-latex";

// Built-in default resume. Uses String.raw so every LaTeX backslash is kept
// verbatim (no JS escape processing). Safe because the source contains no
// backtick or `${` sequence that a template literal would choke on.
export const BUILTIN_DEFAULT_LATEX = String.raw`%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5}
\usepackage{multicol}
\setlength{\multicolsep}{-3.0pt}
\setlength{\columnsep}{-1pt}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.6in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1.19in}
\addtolength{\topmargin}{-.9in}
\addtolength{\textheight}{3.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large\bfseries
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\classesList}[4]{
    \item\small{
        {#1 #2 #3 #4 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{1.0\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & \textbf{\small #2} \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{1.001\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & \textbf{\small #2}\\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemi{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemiii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemiv{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.0in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

\begin{document}

%----------HEADING----------
\begin{center}
    {\Huge \scshape Yash Munshi} \\ \vspace{1pt}
    Dhanbad, Jharkhand, India \\ \vspace{1pt}
    \small \raisebox{-0.1\height}\faPhone\ +91 8539877719 ~ \href{mailto:yashmunshi27@gmail.com}{\raisebox{-0.2\height}\faEnvelope\  \underline{yashmunshi27@gmail.com}} ~
    \href{https://www.linkedin.com/in/yash-munshi-a0408b337/}{\raisebox{-0.2\height}\faLinkedin\ \underline{LinkedIn}}  ~
    \href{https://github.com/YashIsTheBest247}{\faGithub\ \underline{GitHub}} ~
    \href{https://yash-munshi.vercel.app/}{\raisebox{-0.2\height}\faBriefcase\ \underline{Portfolio}} ~
    \href{https://leetcode.com/me_yashmunshi}{\raisebox{-0.2\height}\faCode\ \underline{LeetCode}}
\end{center}

%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Kalinga Institute of Industrial Technology}{July 2023 -- July 2027}
      {B. Tech in Electronics and Computer Science Engineering, CGPA: 9.19}{Bhubaneswar, Odisha}
  \resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart

      \resumeSubheading
      {NexCell Solutions}{March 2026 -- Present}
      {Backend Developer Intern}{London, United Kingdom (Remote)}
      \resumeItemListStart
        \resumeItem{Developed 15+ scalable REST API endpoints using FastAPI and PostgreSQL for ConneX AI, enabling real-time workflow automation and backend integration.}
        \resumeItem{Built an event-driven automation engine using Celery and Redis for asynchronous trigger-action execution, improving workflow scalability and enabling reliable background task processing.}
        \resumeItem{Implemented DAG-based workflow orchestration with conditional execution logic to support extensible multi-node automation pipelines.}
      \resumeItemListEnd
 \resumeSubheading
      {Soul AI}{April 2026 -- May 2026}
      {LLM Evaluation Engineer -- Freelance (Project Groot)}{Delaware, United States (Remote)}
      \resumeItemListStart
        \resumeItem{Evaluated 20+ Large Language Model (LLM) responses within RLHF pipelines, improving response quality, factual consistency, and safety alignment across evaluation workflows.}
        \resumeItem{Performed structured analysis of model responses to identify edge cases, hallucinations, logical inconsistencies, and failure patterns.}
      \resumeItemListEnd
  \resumeSubHeadingListEnd

%-----------PROJECTS-----------
\section{Projects}
    \vspace{-1pt}
    \resumeSubHeadingListStart
      \resumeProjectHeading
          {\textbf{DealDrop} $|$ \href{https://dealdroppro.vercel.app}{\textcolor{blue}{Live}} $|$ \emph{React.js, Node.js, Express.js, Supabase (PostgreSQL), Google OAuth 2.0}}{}
          \vspace{-8pt}
          \resumeItemListStart
            \resumeItem{Built scalable full-stack architecture using Supabase (PostgreSQL) and production deployment workflows supporting 500+ tracked products.}
            \resumeItem{Integrated Google OAuth and Firecrawl API for secure authentication and automated product data extraction.}
            \resumeItem{Developed CRON-based workflows for periodic scraping, price validation, and real-time price-drop alerts.}
          \resumeItemListEnd
          \vspace{-10pt}
      \resumeProjectHeading
          {\textbf{Flux AI} $|$ \href{https://github.com/YashIsTheBest247/FluxAI}{\textcolor{blue}{GitHub}} $|$ \emph{Next.js, NLP, FastAPI, Python, FFmpeg, MoviePy, Pillow, Kokoro TTS}}{}
          \vspace{-8pt}
          \resumeItemListStart
           \resumeItem{Built an end-to-end AI content generation pipeline by integrating AI APIs that transformed text prompts into narrated videos and podcasts with automated subtitle generation.}
\resumeItem{Architected a multi-provider inference orchestration system with intelligent fallback routing across LLM, image generation, and speech synthesis models, reducing generation costs from \$50--200 to near \$0 per short-form video.}

\resumeItem{Built full content workflow: text parsing, subtitle generation, 1080X1920 video assembly, thumbnail creation, and automated YouTube publishing.}
          \resumeItemListEnd

    \resumeSubHeadingListEnd
\vspace{-15pt}

%-----------PROGRAMMING SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: Java, Python, C/C++, JavaScript, SQL} \\[4pt]
     \textbf{Databases:} PostgreSQL, MySQL, Supabase, Redis \\[4pt]
     \textbf{Developer Tools}{: GitHub, Git, Docker, Alembic, Cloudflare, Firebase, Linux, CI/CD Pipelines} \\[4pt]
     \textbf{Generative AI and LLMs}{: OpenAI GPT-4/4o, Gemini API, Hugging Face Transformers, LangChain, AI Agents, Retrieval-Augmented Generation (RAG), Prompt Engineering, Claude, Codex, AI-assisted Development Workflows} \\[4pt]
     \textbf{Technologies/Frameworks}{: React.js, FastAPI, Flask, REST APIs, OAuth 2.0, Node.js, Express.js, HTML, CSS, ORM} \\[4pt]
     \textbf{Core Concepts}{: Data Structures and Algorithms, OOP, Operating Systems, DBMS, Automated Testing} \\
    }}
 \end{itemize}
 \vspace{-16pt}

%-----------INVOLVEMENT---------------
\section{Achievements / Extracurricular}
    \resumeSubHeadingListStart
            \resumeItemListStart
                \resumeItem{CyberPeace Hackathon 2026 finalist among 350+ competing teams.}
                \resumeItem{Recognized as Expert Contributor at Deccan AI for AI evaluation and technical contributions.}
                \resumeItem{Apprenticeship - Dev Weekends Fellow.}
                \resumeItem{District Rank 4 and 5 in the International English Olympiad (IEO) for two consecutive years.}
                \resumeItem{Shortlisted for the Samsung Fellowship (ISWDP Cohort 7.0) from 4700+ applicants.}
                 \resumeItem{Selected Participant at the Harvard Health Systems Innovation Lab (India Hub).}
                 \resumeItem{Solved 200+ Data Structures and Algorithms problems across LeetCode, CodeChef, and similar platforms.}

            \resumeItemListEnd
    \resumeSubHeadingListEnd

\end{document}
`;

export function loadDefaultLatex(): string {
  try {
    const saved = localStorage.getItem(KEY);
    return saved && saved.trim() ? saved : BUILTIN_DEFAULT_LATEX;
  } catch {
    return BUILTIN_DEFAULT_LATEX;
  }
}

export function saveDefaultLatex(latex: string): void {
  try {
    if (latex.trim()) {
      localStorage.setItem(KEY, latex);
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    /* localStorage disabled — silently no-op */
  }
}

export function hasDefaultLatex(): boolean {
  return loadDefaultLatex().trim().length > 0;
}
