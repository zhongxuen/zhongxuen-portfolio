# Portfolio Website - Master Context 

## Project Overview 
This project is a professional portfolio website designed to showcase the developer's technical skills, software engineering experience, projects, education, certifications, achievements, and contact information. The primary purpose of the website is to: 
- Introduce the developer professionally 
- Demonstrate technical skills 
- Showcase software projects 
- Improve employability 
- Serve as a portfolio for internships and full-time software engineering positions 
- Demonstrate frontend development ability through the website itself 
The website should look and behave like a modern professional developer portfolio rather than a personal blog or social media page. 

--- 

# Overall Philosophy 
Every design and development decision should prioritize: 
1. Professional appearance 
2. Excellent user experience 
3. Maintainable architecture 
4. Performance 
5. Accessibility 
6. Responsiveness 
7. SEO 
8. Clean and reusable code 
Avoid unnecessary complexity. Only introduce additional technologies or libraries if they provide meaningful benefits. 

--- 

# Target Audience 
The website is primarily intended for: 
- Recruiters 
- Hiring managers 
- Software engineers 
- Technical interviewers 
- Internship coordinators 
- Potential clients 
The website should help visitors understand the developer within approximately 30 seconds. 

--- 

# Technology Stack 
Framework: Next.js (App Router) 
Language: TypeScript 
Styling: Tailwind CSS 
Animations: Framer Motion 
Icons: Lucide React 
Deployment: Vercel 
Repository: GitHub 
Development Environment: Visual Studio Code 
Database: Supabase (only if dynamic features become necessary) 
Analytics: Vercel Analytics 

--- 

# Database Philosophy 
The initial version of the portfolio should remain mostly static. Do not introduce a database unless there is a clear requirement. Supabase may later be used for: 
- Blog system 
- Visitor analytics 
- Contact submissions 
- Guestbook 
- Admin dashboard 
- Dynamic project management 
Avoid unnecessary backend complexity. 

--- 

# Project Structure 
The project should remain modular. Expected organization: 
app/ 
components/ 
data/ 
lib/ 
public/ 
styles/ 
Components should remain reusable. Business logic should not be mixed with UI whenever possible. 

--- 

# Website Sections 
The portfolio should include: 
- Home 
- About 
- Skills 
- Projects 
- Experience 
- Education 
- Contact 
- Resume 
Additional sections may be added later if they improve the portfolio. 

--- 

# Home Page Goals 
The landing page should immediately communicate: Who the developer is. What the developer specializes in. Why someone should continue exploring the portfolio. 
Include: 
- Hero section 
- Introduction 
- CTA buttons 
- Statistics 
- Featured projects 
- Quick skills overview 

--- 

# Skills 
Skills should be organized by category instead of proficiency bars. Suggested categories include: 
Frontend 
Backend 
Programming Languages 
Databases 
Frameworks 
Developer Tools 
Cloud & Deployment 
Other Technologies 

--- 

# Projects 
Projects are the most important section of the website. Each project should include: 
- Title 
- Description 
- Technologies 
- GitHub link 
- Live Demo (if available) 
- Screenshots 
- Key Features 
- Challenges 
- Lessons Learned 
- Future Improvements 
Projects should eventually be automatically synchronized with GitHub whenever practical. 

--- 

# GitHub Integration 
GitHub should become the primary source of project information. Possible features include: 
- Featured repositories 
- Repository language 
- Stars 
- Last updated date 
- GitHub profile link 
The portfolio should avoid manually duplicating information that GitHub already provides. 

--- 

# UI Design 
Design style: Minimal Modern Professional Developer-oriented Clean Readable 
Use generous whitespace. Avoid excessive animations. Avoid clutter. 

--- 

# Color Theme 
Dark-first design. Suggested palette: 
Background: #0F172A 
Cards: #1E293B 
Primary: #3B82F6 
Secondary: #38BDF8 
Text: #F8FAFC 
Muted: #94A3B8 
Success: #10B981 
These values may evolve but should remain visually consistent. 

--- 

# Typography 
Headings: Poppins 
Body: Inter 
Code: JetBrains Mono 
Typography should emphasize readability. 

--- 

# Animation Philosophy 
Animations should enhance usability. Preferred animation styles: 
- Fade 
- Slide 
- Scale 
- Small hover interactions 
Avoid: 
- Long animations 
- Distracting motion 
- Excessive parallax 
- Gimmicks 
Animations should never slow navigation. 

--- 

# Responsiveness 
The website must support: Desktop Tablet Mobile 
Responsive behavior should be considered during implementation rather than added later. 

--- 

# Accessibility 
Accessibility should always be considered. Include: 
Semantic HTML 
Keyboard navigation 
ARIA attributes where appropriate 
Proper heading hierarchy 
Accessible color contrast 
Alt text 
Focus states 

--- 

# Performance Goals 
Aim for high Lighthouse scores. Target: 
Performance: 95+ 
Accessibility: 100 
Best Practices: 100 
SEO: 100 
Prefer server-side rendering and static generation whenever appropriate. Optimize images. Lazy load non-critical assets. Avoid unnecessary JavaScript. 

--- 

# SEO 
Every page should support: 
Metadata 
Title 
Description 
Open Graph 
Twitter Cards 
Robots 
Sitemap 
Structured metadata where appropriate. 

--- 

# Future Expansion 
The architecture should allow future support for: 
Blog 
Admin dashboard 
Visitor analytics 
CMS 
Case studies 
GitHub synchronization 
Dark/Light themes 
Project filtering 
Search 
Command palette 
Internationalization 
The architecture should remain scalable without requiring major rewrites. 

--- 

# Coding Standards & AI Behavior (TOKEN-OPTIMIZED)
Prioritize: Readability, Maintainability, Reusability, Consistency, and Strong typing. Avoid duplicate code. Prefer composition over duplication. Keep components focused on a single responsibility.

### AI Context & Token Reduction Rules:
1. STRICT CODE OUTPUT: Return ONLY executable code blocks. No explanations, no introductory greetings, no "Here is the code", and no concluding summaries.
2. PARTIAL SNIPPETS ONLY: Never rewrite an entire 100-line component to change 5 lines. Output only the target function or modified snippet. Use comments like `// ... existing code ...` to represent untouched logic blocks.
3. ERROR TREATMENT: When a bug is pointed out, immediately output the corrected snippet. Do not apologize, analyze why it happened, or explain the fix.
4. CONDITION SYSTEM: If a workflow contains dependent code paths, provide all blocks in a single response using separate code blocks. Do not wait for user validation unless critical data is missing.
5. CHAT OVERRIDE: To bypass this compression mode for file structures, architecture diagrams, or mental explanations, the user's prompt will explicitly include the tag `[EXPLAIN]`. If `[EXPLAIN]` is absent, enforce raw code snippets.

--- 

# Overall Goal 
The final product should represent the quality expected from a professional software developer. The website itself should serve as evidence of the developer's engineering ability, UI/UX understanding, code quality, and attention to detail.