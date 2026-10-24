# Product Requirements Document: Leadership Learning & Development Application

**Status:** Approved
**Target repo:** https://github.com/sops-people/Leadership-skills-
**Author:** Darko Rumenjak (drafted with Claude)
**Date:** 2026-10-24

---

## 1. Overview

An application that helps leaders and aspiring leaders identify their skill and behavioral blind spots, then provides targeted training to close those gaps — covering both hard leadership competencies (strategy, financial acumen, org design) and soft skills (communication, empathy, self-awareness).

## 2. Problem Statement

Most leadership development today is generic (one-size-fits-all courses) rather than diagnostic. Leaders often don't know which specific skills they're weakest in, and even when they do, they lack a clear, structured path to improve. This leads to:
- Wasted training spend on skills the leader already has
- Blind spots that go uncorrected because no one surfaces them
- Inconsistent leadership quality across an organization, especially at the transition into senior/C-level roles

## 3. Goals

1. Help a user identify their leadership blind spots and skill gaps through structured assessment.
2. Map identified gaps to a personalized upskilling path.
3. Provide an authoritative, verifiable taxonomy of skills required at C-level roles, including soft skills, so gaps can be measured against a real bar.
4. Track progress over time as skills are developed.

## 4. Non-Goals (Out of Scope for v1)
- Full LMS content authoring tools (the app discovers/recommends training content, not a course editor)
- Team/org-level rollup, dashboards, or admin views — v1 is single-player (individual user only)
- Certification or credentialing

## 5. Target Users
- Individual leaders (managers through C-level) who want to self-assess and grow
- Aspiring leaders preparing for promotion into senior/C-level roles
- v1 is single-player: the individual user and the peers/managers they invite for 360 input. No org/HR admin view in v1.

## 6. Core Features

### 6.1 Blind Spot & Skill Gap Identification
*(Requirement: identifying blind spots and skills)*
- Self-assessment survey against the skill taxonomy (Section 7)
- 360-feedback loop is in scope for v1 (not deferred): the user invites peers/manager/direct reports to rate them against the same taxonomy, surfacing blind spots as gaps between self-rating and others' rating
- Gap report: ranks skills by (a) importance to the user's current/target role and (b) size of gap (self vs. role bar, and self vs. 360 perception)

### 6.2 Personalized Upskilling Path
*(Requirement: training on how to bridge the gap and upskill)*
- For each identified gap, the app actively finds relevant training content (search/discovery across external sources — articles, courses, videos) and recommends it — not a static pre-curated list, and not original content authored by the app
- Sequenced learning path prioritized by gap size × role relevance
- Progress tracking: mark skills as "in progress" / "improved" / re-assess periodically

### 6.3 C-Level Skill Taxonomy
*(Requirement: include all skills required at C-level roles)*
See Section 7.

### 6.4 Soft Skills Coverage
*(Requirement: include soft skills)*
See Section 7 — soft skills are included as a first-class category alongside hard/strategic skills, not an afterthought.

## 7. Skill Taxonomy

### 7.1 Hard / Strategic Skills (C-level)
| Skill | Why it matters at C-level |
|---|---|
| Strategic thinking & vision-setting | Defines direction for the org |
| Financial acumen & P&L ownership | Accountable for business outcomes |
| Organizational design & change management | Shapes how the company is structured and evolves |
| Stakeholder & board management | Manages upward/outward accountability |
| Cross-functional influence | Drives alignment across departments without direct authority |
| Crisis & risk management | Handles high-stakes, high-ambiguity situations |
| Talent development & succession planning | Builds the next layer of leadership |
| Decision-making under ambiguity | Makes calls with incomplete information |
| Ethical judgment & governance | Sets the standard for compliance and integrity |
| Industry/market expertise | Credibility and pattern recognition in the domain |
| Negotiation | High-stakes deals, partnerships, compensation |

### 7.2 Soft Skills
| Skill | Why it matters |
|---|---|
| Communication & storytelling | Aligns and motivates at scale |
| Empathy & active listening | Builds trust, surfaces real issues early |
| Emotional intelligence & self-awareness | Core to identifying one's own blind spots |
| Conflict resolution | Leaders mediate disputes constantly |
| Adaptability & resilience | Leading through ambiguity and setbacks |
| Giving & receiving feedback | Foundation of people management and growth |
| Inclusive leadership | Building belonging across diverse teams |
| Coaching & mentoring mindset | Developing others, not just directing them |

## 8. User Flow (high-level)
1. User signs up, selects current role / target role (e.g., "Director → VP" or "VP → C-level")
2. User completes self-assessment against the taxonomy, and invites peers/manager/direct reports for 360 input
3. App generates a gap report (self vs. role bar, self vs. others' perception)
4. App searches for and recommends training content for each gap, forming a personalized learning path
5. User works through learning path; periodically re-assesses (self + 360) to track improvement

## 9. Success Metrics
- % of users who complete the initial assessment
- Average gap-closure rate per skill over a defined period (e.g., 90 days)
- Self-vs-360 rating convergence over time (blind spot reduction)
- Learning path completion rate

## 10. Decisions (resolved)
- **360-feedback loop:** in scope for v1, not deferred.
- **Training content source:** the app finds (searches/discovers) and recommends external content — not a static curated list, not original content authored in-app.
- **Single-player vs. org rollup:** single-player for v1. No team/org-level rollup, dashboards, or admin views.
