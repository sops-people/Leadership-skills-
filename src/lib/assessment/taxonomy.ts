// Skill taxonomy from PRD section 7: 11 C-level skills and 8 soft skills.
// Owner: Darko (moved from his Task 1 code; content unchanged).
//
// bars: the expected level (1-5 on the rating scale) at each target role.
// importance: how much the skill matters at that role (1 = useful, 2 = important, 3 = critical).
// Both are a first draft for the team to confirm (see "Role bars" in the build plan).
import type { TargetRole } from "@/shared/roles";

export type CategoryId = "c_level" | "soft";

export type Skill = {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  statement: string;
  behaviours: string[];
  bars: Record<TargetRole, number>;
  importance: Record<TargetRole, 1 | 2 | 3>;
};

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: "c_level", name: "C-level skills" },
  { id: "soft", name: "Soft skills" },
];

export const IMPORTANCE_LABELS: Record<number, string> = { 1: "Useful", 2: "Important", 3: "Critical" };

export const SKILLS: Skill[] = [
  {
    id: 'strategic-thinking',
    name: 'Strategic thinking & vision-setting',
    category: 'c_level',
    description: 'Defines where the organisation is going and why, and connects today’s work to that direction.',
    statement: 'Sets a clear long-term direction and explains how current priorities connect to it.',
    behaviours: [
      'Writes and communicates a 2–3 year direction for their area',
      'Says no to work that does not serve the strategy',
      'Spots market or technology shifts early and adjusts plans',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'financial-acumen',
    name: 'Financial acumen & P&L ownership',
    category: 'c_level',
    description: 'Understands how the business makes and spends money, and owns the financial results of their area.',
    statement: 'Makes decisions based on their financial impact and takes ownership of budget and P&L results.',
    behaviours: [
      'Reads a P&L, balance sheet and cash-flow statement with confidence',
      'Builds and defends a budget, and explains variances',
      'Weighs investments by expected return, not just cost',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'org-design-change',
    name: 'Organizational design & change management',
    category: 'c_level',
    description: 'Shapes how teams are structured and leads people through change without losing momentum.',
    statement: 'Designs team structures that fit the strategy and leads people through change effectively.',
    behaviours: [
      'Redesigns teams, roles and reporting lines when the strategy changes',
      'Plans a change with clear communication, timing and support',
      'Notices and addresses resistance early',
    ],
    bars: { Director: 2, VP: 4, "C-level": 5 },
    importance: { Director: 1, VP: 2, "C-level": 3 },
  },
  {
    id: 'stakeholder-board',
    name: 'Stakeholder & board management',
    category: 'c_level',
    description: 'Manages relationships and accountability upward and outward: executives, board, investors, partners.',
    statement: 'Builds trust with senior stakeholders and keeps them informed, aligned and confident.',
    behaviours: [
      'Prepares concise board or executive updates with clear asks',
      'Manages expectations before problems become surprises',
      'Understands what each key stakeholder cares about',
    ],
    bars: { Director: 2, VP: 3, "C-level": 5 },
    importance: { Director: 1, VP: 2, "C-level": 3 },
  },
  {
    id: 'cross-functional-influence',
    name: 'Cross-functional influence',
    category: 'c_level',
    description: 'Gets alignment and action across departments without relying on direct authority.',
    statement: 'Gets other teams to commit to shared goals, even without authority over them.',
    behaviours: [
      'Builds relationships with peer leaders before they are needed',
      'Frames proposals in terms of the other team’s goals',
      'Resolves cross-team blockers instead of escalating by default',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'crisis-risk',
    name: 'Crisis & risk management',
    category: 'c_level',
    description: 'Anticipates risks and leads calmly and decisively when things go wrong.',
    statement: 'Identifies risks early and leads calmly and decisively in a crisis.',
    behaviours: [
      'Keeps a current view of the biggest risks in their area',
      'Takes charge in an incident and communicates clearly under pressure',
      'Runs a blameless review afterwards and fixes root causes',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 2, "C-level": 3 },
  },
  {
    id: 'talent-succession',
    name: 'Talent development & succession planning',
    category: 'c_level',
    description: 'Builds the next layer of leaders and makes sure key roles have successors.',
    statement: 'Develops strong leaders and makes sure key roles have a ready successor.',
    behaviours: [
      'Has a named successor, or a plan for one, for their own role',
      'Gives high-potential people stretch assignments',
      'Makes hard calls on under-performance in good time',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'decision-ambiguity',
    name: 'Decision-making under ambiguity',
    category: 'c_level',
    description: 'Makes sound calls with incomplete information and adjusts as facts emerge.',
    statement: 'Makes timely, sound decisions when information is incomplete, and adjusts as facts emerge.',
    behaviours: [
      'Decides at the right speed instead of waiting for certainty',
      'Separates reversible from irreversible decisions',
      'States assumptions and revisits the decision when they change',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'ethics-governance',
    name: 'Ethical judgment & governance',
    category: 'c_level',
    description: 'Sets the standard for integrity and compliance, including when it is costly.',
    statement: 'Acts with integrity and upholds ethical and compliance standards, even when it is costly.',
    behaviours: [
      'Raises ethical concerns openly, even when it is unpopular',
      'Knows the rules and regulations that apply to their area',
      'Makes sure their team can report problems without fear',
    ],
    bars: { Director: 4, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 2, "C-level": 3 },
  },
  {
    id: 'industry-expertise',
    name: 'Industry/market expertise',
    category: 'c_level',
    description: 'Knows the industry, customers and competitors well enough to spot patterns others miss.',
    statement: 'Understands the industry, customers and competitors deeply and uses that knowledge in decisions.',
    behaviours: [
      'Can explain how the company wins against its main competitors',
      'Stays close to customers through direct conversations',
      'Brings outside trends and data into planning',
    ],
    bars: { Director: 3, VP: 4, "C-level": 4 },
    importance: { Director: 2, VP: 2, "C-level": 2 },
  },
  {
    id: 'negotiation',
    name: 'Negotiation',
    category: 'c_level',
    description: 'Reaches good agreements in high-stakes deals, partnerships and people decisions.',
    statement: 'Negotiates agreements that serve the organisation while keeping relationships intact.',
    behaviours: [
      'Prepares by knowing their walk-away point and the other side’s interests',
      'Looks for trades that create value for both sides',
      'Holds firm on what matters without damaging trust',
    ],
    bars: { Director: 3, VP: 3, "C-level": 4 },
    importance: { Director: 1, VP: 2, "C-level": 3 },
  },
  {
    id: 'communication-storytelling',
    name: 'Communication & storytelling',
    category: 'soft',
    description: 'Explains ideas clearly and in a way that moves people, from one-to-ones to all-hands.',
    statement: 'Communicates clearly and persuasively, adapting the message to the audience.',
    behaviours: [
      'Opens with the point, then the supporting detail',
      'Uses stories and examples to make a message stick',
      'Adjusts the message for executives, teams and customers',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 3, VP: 3, "C-level": 3 },
  },
  {
    id: 'empathy-listening',
    name: 'Empathy & active listening',
    category: 'soft',
    description: 'Understands what people think and feel, and makes them feel heard.',
    statement: 'Listens fully and shows genuine understanding of other people’s views and feelings.',
    behaviours: [
      'Asks questions before giving opinions',
      'Summarises what they heard to check understanding',
      'Notices when someone is struggling and checks in',
    ],
    bars: { Director: 4, VP: 4, "C-level": 4 },
    importance: { Director: 3, VP: 3, "C-level": 2 },
  },
  {
    id: 'emotional-intelligence',
    name: 'Emotional intelligence & self-awareness',
    category: 'soft',
    description: 'Knows their own strengths, weaknesses and triggers, and manages their reactions.',
    statement: 'Is aware of their own strengths, limits and emotions, and manages how they react.',
    behaviours: [
      'Names their own weaknesses accurately',
      'Stays composed when challenged or criticised',
      'Notices how their mood affects the team',
    ],
    bars: { Director: 4, VP: 4, "C-level": 5 },
    importance: { Director: 3, VP: 3, "C-level": 3 },
  },
  {
    id: 'conflict-resolution',
    name: 'Conflict resolution',
    category: 'soft',
    description: 'Deals with disagreement directly and turns it into a better outcome.',
    statement: 'Addresses conflict directly and helps people reach a constructive resolution.',
    behaviours: [
      'Raises tension early instead of letting it grow',
      'Separates the people from the problem',
      'Helps both sides agree on next steps',
    ],
    bars: { Director: 3, VP: 4, "C-level": 4 },
    importance: { Director: 3, VP: 2, "C-level": 2 },
  },
  {
    id: 'adaptability-resilience',
    name: 'Adaptability & resilience',
    category: 'soft',
    description: 'Adjusts quickly to change and recovers from setbacks, helping the team do the same.',
    statement: 'Adapts quickly to change and recovers from setbacks, keeping the team steady.',
    behaviours: [
      'Changes plans quickly when the situation changes',
      'Treats setbacks as information, not failure',
      'Keeps energy and focus up during difficult periods',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'feedback',
    name: 'Giving & receiving feedback',
    category: 'soft',
    description: 'Gives honest, useful feedback and invites and acts on feedback from others.',
    statement: 'Gives honest, specific feedback and actively asks for and acts on feedback about themselves.',
    behaviours: [
      'Gives specific feedback soon after the event',
      'Asks for feedback regularly, including from their team',
      'Responds to criticism with curiosity, not defensiveness',
    ],
    bars: { Director: 4, VP: 4, "C-level": 4 },
    importance: { Director: 3, VP: 3, "C-level": 2 },
  },
  {
    id: 'inclusive-leadership',
    name: 'Inclusive leadership',
    category: 'soft',
    description: 'Builds teams where people with different backgrounds and views belong and contribute.',
    statement: 'Makes sure people with different backgrounds and views are heard and can contribute fully.',
    behaviours: [
      'Draws out quieter voices in meetings',
      'Checks hiring and promotion decisions for bias',
      'Acts when someone is excluded or treated unfairly',
    ],
    bars: { Director: 3, VP: 4, "C-level": 5 },
    importance: { Director: 2, VP: 3, "C-level": 3 },
  },
  {
    id: 'coaching-mentoring',
    name: 'Coaching & mentoring mindset',
    category: 'soft',
    description: 'Grows people by asking and guiding rather than only directing.',
    statement: 'Helps others grow by coaching and guiding them, not only telling them what to do.',
    behaviours: [
      'Asks coaching questions before giving answers',
      'Holds regular development conversations with each report',
      'Mentors people outside their own team',
    ],
    bars: { Director: 4, VP: 4, "C-level": 4 },
    importance: { Director: 3, VP: 3, "C-level": 2 },
  },
];

export const skillById = (id: string) => SKILLS.find((s) => s.id === id);
export const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
