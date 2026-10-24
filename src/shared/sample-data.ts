// Sample data so everyone can build against the shared formats from week 1,
// before the real hand-offs are connected in weeks 5-6. Owners: replace your part.
import type { GapReport, Skill } from "./formats";
import type { Rating } from "@/lib/privacy/anonymity";

/** PRD section 7. Owner: Darko (skill ids are a placeholder). */
export const SAMPLE_SKILLS: Skill[] = [
  { skillId: "strategic-thinking", name: "Strategic thinking & vision-setting", category: "c_level" },
  { skillId: "financial-acumen", name: "Financial acumen & P&L ownership", category: "c_level" },
  { skillId: "org-design-change", name: "Organizational design & change management", category: "c_level" },
  { skillId: "stakeholder-board", name: "Stakeholder & board management", category: "c_level" },
  { skillId: "cross-functional-influence", name: "Cross-functional influence", category: "c_level" },
  { skillId: "crisis-risk", name: "Crisis & risk management", category: "c_level" },
  { skillId: "talent-succession", name: "Talent development & succession planning", category: "c_level" },
  { skillId: "decision-ambiguity", name: "Decision-making under ambiguity", category: "c_level" },
  { skillId: "ethics-governance", name: "Ethical judgment & governance", category: "c_level" },
  { skillId: "industry-expertise", name: "Industry/market expertise", category: "c_level" },
  { skillId: "negotiation", name: "Negotiation", category: "c_level" },
  { skillId: "communication-storytelling", name: "Communication & storytelling", category: "soft" },
  { skillId: "empathy-listening", name: "Empathy & active listening", category: "soft" },
  { skillId: "emotional-intelligence", name: "Emotional intelligence & self-awareness", category: "soft" },
  { skillId: "conflict-resolution", name: "Conflict resolution", category: "soft" },
  { skillId: "adaptability-resilience", name: "Adaptability & resilience", category: "soft" },
  { skillId: "feedback", name: "Giving & receiving feedback", category: "soft" },
  { skillId: "inclusive-leadership", name: "Inclusive leadership", category: "soft" },
  { skillId: "coaching-mentoring", name: "Coaching & mentoring mindset", category: "soft" },
];

/** Three sample users (User profile format, minus system fields). */
export const SAMPLE_USERS = [
  { name: "Alex Sample", email: "alex@example.com", currentRole: "VP", targetRole: "C-level" },
  { name: "Sam Sample", email: "sam@example.com", currentRole: "Director", targetRole: "VP" },
  { name: "Jo Sample", email: "jo@example.com", currentRole: "Manager", targetRole: "Director" },
] as const;

/** One 360 cycle for Alex: self, manager, 3 peers, 2 direct reports (too few to show). */
export const SAMPLE_RATINGS: Rating[] = [
  { raterId: "alex", raterType: "self", skillId: "communication-storytelling", score: 4 },
  { raterId: "alex", raterType: "self", skillId: "financial-acumen", score: 3 },
  { raterId: "mgr-1", raterType: "manager", skillId: "communication-storytelling", score: 3 },
  { raterId: "mgr-1", raterType: "manager", skillId: "financial-acumen", score: 3 },
  { raterId: "peer-1", raterType: "peer", skillId: "communication-storytelling", score: 3, comment: "Clear in meetings, less so in writing." },
  { raterId: "peer-2", raterType: "peer", skillId: "communication-storytelling", score: 2 },
  { raterId: "peer-3", raterType: "peer", skillId: "communication-storytelling", score: 3 },
  { raterId: "peer-1", raterType: "peer", skillId: "financial-acumen", score: 4 },
  { raterId: "peer-2", raterType: "peer", skillId: "financial-acumen", score: 4 },
  { raterId: "peer-3", raterType: "peer", skillId: "financial-acumen", score: 3 },
  { raterId: "dr-1", raterType: "direct-report", skillId: "communication-storytelling", score: 2, comment: "Hidden: only 2 direct reports." },
  { raterId: "dr-2", raterType: "direct-report", skillId: "communication-storytelling", score: 3 },
];

/** A gap report for Alex (placeholder format; owner: Darko). */
export const SAMPLE_GAP_REPORT: Omit<GapReport, "userId" | "createdAt"> = {
  reportId: "sample-report-1",
  cycle: 1,
  gaps: [
    { skillId: "communication-storytelling", roleGap: 1.5, selfVs360Gap: 1.2 },
    { skillId: "financial-acumen", roleGap: 1, selfVs360Gap: -0.5 },
  ],
};
