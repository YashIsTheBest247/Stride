/**
 * Built-in resume presets + per-preset persistence.
 *
 * Three starting points ship in the bundle: Off-Campus, On-Campus, and
 * Priority (high-priority off-campus). The picker loads any of them into the
 * editor. If you edit a loaded preset and click Save, that edited .tex is
 * persisted PER PRESET in localStorage (key `stride:default:<id>`) and is what
 * loads for that preset from then on. Saved overrides stay in the browser and
 * are never sent to the backend. LaTeX is stored with String.raw so every
 * backslash is preserved verbatim (the sources contain no backtick or `${`).
 */
const KEY_PREFIX = "stride:default:";

// ── On-Campus ──────────────────────────────────────────────────────────────
export const RESUME_ON_CAMPUS_LATEX = String.raw`%-------------------------
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
\addtolength{\topmargin}{-.7in}
\addtolength{\textheight}{1.4in}

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
      \textbf{#1} & \textbf{\small #2} \\[3pt]
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-3pt}
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
   \href{https://yash-munshi.vercel.app}{\raisebox{-0.2\height}\faBriefcase\ \underline{Portfolio}} ~
   \href{https://leetcode.com/u/me_yashmunshi/}{\raisebox{-0.2\height}{\faCode}\ \underline{LeetCode}}
\end{center}

%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Kalinga Institute of Industrial Technology}{July 2023 -- July 2027}
      {B. Tech in Electronics and Computer Science Engineering, CGPA: 9.19}{Bhubaneswar, Odisha}
    \resumeSubheading
      {De Nobili School CMRI}{July 2020 -- July 2022}
      {Senior Secondary Education, Percentage: 82\%}{Dhanbad, Jharkhand}
    \resumeSubheading
      {De Nobili School Bhuli}{March 2009 -- March 2020}
      {Secondary Education, Percentage: 90.6\%}{Dhanbad, Jharkhand}
  \resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Soul AI}{April 2026 -- May 2026}
      {Freelance (Project Groot)}{Delaware, United States (Remote)}
      \resumeItemListStart
        \resumeItem{Evaluated 20+ Large Language Model (LLM) responses within RLHF pipelines, improving response quality, factual consistency, and safety alignment across evaluation workflows.}
        \resumeItem{Performed structured analysis of LLM responses to identify edge cases and failure modes.}
      \resumeItemListEnd
      \resumeSubheading
      {NexCell Solutions}{March 2026 -- Present}
      {Backend Developer Intern}{London, United Kingdom (Remote)}
      \resumeItemListStart
        \resumeItem{Developed 15+ scalable REST API endpoints using FastAPI and PostgreSQL for ConneX AI, enabling real-time workflow automation and backend integration.}
        \resumeItem{Built an event-driven automation engine using Celery and Redis for asynchronous trigger-action execution, improving workflow scalability and enabling reliable background task processing.}
        \resumeItem{Implemented DAG-based workflow orchestration with conditional execution logic to support extensible multi-node  automation pipelines.}
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
            \resumeItem{Built a full-stack web application supporting 500+ tracked products with automated price monitoring and email notifications.}
            \resumeItem{Integrated Google OAuth and Firecrawl API for secure authentication and automated product data extraction.}
            \resumeItem{Developed CRON-based workflows for periodic scraping, price validation, and real-time price-drop alerts.}
          \resumeItemListEnd
          \vspace{-10pt}
      \resumeProjectHeading
          {\textbf{PreVuCam} $|$ \href{https://prevucam.streamlit.app/}{\textcolor{blue}{Live}} $|$ \emph{Python, OpenCV, Streamlit, FFmpeg, MoviePy}}{}
          \vspace{-6pt}
          \resumeItemListStart
            \resumeItem{Developed PreVuCam, a Streamlit-based AI extension that enables AI inferences on traditional cameras.}
            \resumeItem{Implemented automated  7-second pre-event and post-event buffering, reducing storage usage upto 62\%, power consumption, and manual surveillance review time.}
            \resumeItem{Built a complete processing pipeline to extract, trim, and compile motion events into a single downloadable MP4 file with integrated logging for monitoring and debugging.}
          \resumeItemListEnd
    \resumeSubHeadingListEnd

\vspace{-5pt}

%-----------PROGRAMMING SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: Java, Python, C/C++} \\[4pt]
     \textbf{Databases}{: PostgreSQL, MySQL, Redis, Supabase} \\[4pt]
     \textbf{Developer Tools}{: GitHub, Git, Docker, Alembic} \\[4pt]
     \textbf{Technologies/Frameworks}{: React.js, FastAPI, OAuth 2.0, Node.js, Express.js HTML, CSS} \\[4pt]
     \textbf{Generative AI and LLMs}{: PyTorch, Gemini API, LangChain, OpenCV, TensorFlow}\\[4pt]
     \textbf{Fundamentals}{: Data Structures and Algorithms, Operating Systems, DBMS, OOP} \\
    }}
 \end{itemize}
 \vspace{-16pt}

%-----------INVOLVEMENT---------------
\section{Achievements / Extracurricular}
    \resumeSubHeadingListStart
            \resumeItemListStart
                \resumeItem{CyberPeace Hackathon 2026 finalist.}
                \resumeItem{Expert at Deccan AI.}
                \resumeItem{Secured District Rank 4 and 5 in the International English Olympiad (IEO) for two consecutive years.}
                \resumeItem{Shortlisted for the Samsung Fellowship (ISWDP Cohort 7.0) from 4700+ applicants.}
                \resumeItem{Selected Participant at the Harvard Health Systems Innovation Lab (India Hub).}
                \resumeItem{Solved 200+ Data Structures and Algorithms problems across LeetCode, CodeChef, and similar platforms.}
            \resumeItemListEnd
    \resumeSubHeadingListEnd

\end{document}
`;

// ── Off-Campus (also used for Priority until you diverge it) ────────────────
export const RESUME_OFF_CAMPUS_LATEX = String.raw`%-------------------------
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
\addtolength{\topmargin}{-.7in}
\addtolength{\textheight}{1.4in}

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
      \textbf{#1} & \textbf{\small #2} \\[3pt]
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-3pt}
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
      {B. Tech in Electronics and Computer Science Engineering, CGPA: 9.15}{Bhubaneswar, Odisha}
  \resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Soul AI}{April 2026 -- Present}
      {LLM Evaluation Engineer -- Freelance (Project Groot)}{Delaware, United States (Remote)}
      \resumeItemListStart
        \resumeItem{Evaluated 20+ Large Language Model (LLM) responses within RLHF pipelines, improving response quality, factual consistency, and safety alignment across evaluation workflows.}
        \resumeItem{Performed structured analysis of model responses to identify edge cases, hallucinations, logical inconsistencies, and failure patterns.}
      \resumeItemListEnd
      \resumeSubheading
      {NexCell Solutions}{March 2026 -- Present}
      {Backend Developer Intern}{London, United Kingdom (Remote)}
      \resumeItemListStart
        \resumeItem{Developed 15+ scalable REST API endpoints using FastAPI and PostgreSQL for ConneX AI, enabling real-time workflow automation and backend integration.}
        \resumeItem{Built an event-driven automation engine using Celery and Redis for asynchronous trigger-action execution, improving workflow scalability and enabling reliable background task processing.}
        \resumeItem{Implemented DAG-based workflow orchestration with conditional execution logic to support extensible multi-node automation pipelines.}
        \resumeItem{Configured CI/CD pipelines using GitHub Actions to automate testing and deployment processes.}
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
            \resumeItem{Built a full-stack web application supporting 500+ tracked products with automated price monitoring and notifications.}
            \resumeItem{Integrated Google OAuth and Firecrawl API for secure authentication and automated product data extraction.}
            \resumeItem{Developed CRON-based workflows for periodic scraping, price validation, and real-time price-drop alerts.}
          \resumeItemListEnd
          \vspace{-10pt}
      \resumeProjectHeading
          {\textbf{Flux AI} $|$ \href{https://github.com/YashIsTheBest247/FluxAI}{\textcolor{blue}{GitHub}} $|$ \emph{Next.js, NLP, FastAPI, Python, FFmpeg, MoviePy, Pillow, Kokoro TTS}}{}
          \vspace{-8pt}
          \resumeItemListStart
           \resumeItem{Built an end-to-end AI content generation pipeline that transformed text prompts into narrated videos and podcasts with automated subtitle generation.}

\resumeItem{Architected a multi-provider inference orchestration system with intelligent fallback routing across LLM, image generation, and speech synthesis models, reducing generation costs from \$50--200 to near \$0 per short-form video.}

\resumeItem{Built full content workflow: text parsing, subtitle generation, 1080X1920 video assembly, thumbnail creation, and automated YouTube publishing.}
          \resumeItemListEnd

    \resumeSubHeadingListEnd
\vspace{-5pt}

%-----------PROGRAMMING SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: Java, Python, C/C++} \\[4pt]
     \textbf{Databases:} PostgreSQL, MySQL, Supabase, Redis \\[4pt]
     \textbf{Developer Tools}{: GitHub, Git, Docker, Alembic} \\[4pt]
     \textbf{Generative AI and LLMs}{: OpenAI GPT-4/4o, Gemini API, Hugging Face Transformers, LangChain, AI Agents, Retrieval-Augmented Generation (RAG), Prompt Engineering} \\[4pt]
     \textbf{Technologies/Frameworks}{: React.js, FastAPI, OAuth 2.0, Node.js, Express.js, HTML, CSS} \\[4pt]
     \textbf{Core Concepts}{: Data Structures and Algorithms, OOP, Operating Systems, DBMS} \\
    }}
 \end{itemize}
 \vspace{-16pt}

%-----------INVOLVEMENT---------------
\section{Achievements / Extracurricular}
    \resumeSubHeadingListStart
            \resumeItemListStart
                \resumeItem{CyberPeace Hackathon 2026 finalist among 350+ competing teams.}
                \resumeItem{Recognized as Expert Contributor at Deccan AI for AI evaluation and technical contributions.}
                \resumeItem{District Rank 4 and 5 in the International English Olympiad (IEO) for two consecutive years.}
                \resumeItem{Shortlisted for the Samsung Fellowship (ISWDP Cohort 7.0) from 4700+ applicants.}
                 \resumeItem{Selected Participant at the Harvard Health Systems Innovation Lab (India Hub).}
                 \resumeItem{Solved 200+ Data Structures and Algorithms problems across LeetCode, CodeChef, and similar platforms.}
                 \resumeItem{Open Source Contributor at GirlScript Summer of Code (GSSoC).}
            \resumeItemListEnd
    \resumeSubHeadingListEnd

\end{document}
`;

// Priority (high-priority off-campus) currently mirrors Off-Campus. Edit it in
// the app and Save to give it its own persisted version.
export const RESUME_PRIORITY_OFF_CAMPUS_LATEX = RESUME_OFF_CAMPUS_LATEX;

// Back-compat alias for anything that still imports the single built-in.
export const BUILTIN_DEFAULT_LATEX = RESUME_OFF_CAMPUS_LATEX;

export interface ResumePreset {
  id: string;
  label: string; // short text on the button
  title: string; // tooltip / full name
  builtin: string; // shipped default LaTeX
}

export const RESUME_PRESETS: ResumePreset[] = [
  { id: "off-campus", label: "Off-Campus", title: "Load the off-campus resume", builtin: RESUME_OFF_CAMPUS_LATEX },
  { id: "on-campus", label: "On-Campus", title: "Load the on-campus resume", builtin: RESUME_ON_CAMPUS_LATEX },
  { id: "priority", label: "Priority", title: "Load the high-priority off-campus resume", builtin: RESUME_PRIORITY_OFF_CAMPUS_LATEX },
];

function builtinFor(id: string): string {
  return RESUME_PRESETS.find((p) => p.id === id)?.builtin ?? RESUME_PRESETS[0].builtin;
}

/** Saved override for a preset if one exists, otherwise its shipped default. */
export function loadPreset(id: string): string {
  try {
    const saved = localStorage.getItem(KEY_PREFIX + id);
    return saved && saved.trim() ? saved : builtinFor(id);
  } catch {
    return builtinFor(id);
  }
}

/** Persist `latex` as the user's version of preset `id` (empty clears it). */
export function savePreset(id: string, latex: string): void {
  try {
    if (latex.trim()) {
      localStorage.setItem(KEY_PREFIX + id, latex);
    } else {
      localStorage.removeItem(KEY_PREFIX + id);
    }
  } catch {
    /* localStorage disabled — silently no-op */
  }
}

/** True if the user has saved their own version of preset `id`. */
export function presetIsCustomized(id: string): boolean {
  try {
    const s = localStorage.getItem(KEY_PREFIX + id);
    return !!(s && s.trim());
  } catch {
    return false;
  }
}
