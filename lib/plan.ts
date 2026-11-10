// CinemaIP Growth Plan (lean budget version). All rupee figures are planning
// estimates from the plan draft, not quotes. Budgets are in ₹ thousand.

export type Pillar =
  | "Be found"
  | "Be seen"
  | "Build the community"
  | "Contests and intelligence";

export type Payment = "Upfront" | "Pay on result";

export type Initiative = {
  id: number;
  name: string;
  pillar: Pillar;
  budgetK: number;
  payment: Payment;
  costControl: string;
  measure: string;
  watch: string;
};

export type Goal = { goal: string; target: number; label: string; detail: string };

export type Phase = {
  phase: 1 | 2 | 3;
  period: string;
  name: string;
  activities: { initiativeId: number; activity: string }[];
};

export type PayoutRule = { item: string; rule: string; value: number; unit: "₹" | "pts" | "reviews" | "sign-ups" };

export type Decision = { topic: string; question: string; status: "Open" | "Decided" };

export const PILLARS: Pillar[] = ["Be found", "Be seen", "Build the community", "Contests and intelligence"];

/** Each pillar keeps its own hue everywhere (see --pillar-N in globals.css). */
export const pillarColor = (p: Pillar) => `var(--pillar-${PILLARS.indexOf(p) + 1})`;

export const initiatives: Initiative[] = [
  { id: 1, name: "SEO, AEO, GEO", pillar: "Be found", budgetK: 10, payment: "Upfront",
    costControl: "Built in-house. Free tools such as Search Console, schema added in code. One paid tool at most.",
    measure: 'Rank for "[movie] box office collection" on release week; AI citation checks',
    watch: "State how collections are sourced and dated on every page" },
  { id: 2, name: "Bots and agents", pillar: "Be found", budgetK: 10, payment: "Upfront",
    costControl: "Official APIs are free. One low-cost automation tool and small model usage.",
    measure: "Link clicks and sign-ups per 100 comments, per platform",
    watch: "Fully automatic link comments break Meta and X rules; keep the approval queue and rate caps" },
  { id: 3, name: "Channel search and partnerships", pillar: "Be found", budgetK: 5, payment: "Upfront",
    costControl: "Agent plus manual work. Partnerships by barter, no fees.",
    measure: "600 channels mapped, 50 in active conversation",
    watch: "Official APIs and public data only" },
  { id: 4, name: "Offline QR", pillar: "Be seen", budgetK: 10, payment: "Upfront",
    costControl: "Colleges through ambassadors. A few hundred small prints. Theatres by permission.",
    measure: "Scans and sign-ups per placement, cost per sign-up",
    watch: "Venue permission up front and a poster refresh schedule" },
  { id: 5, name: "Metro ads (deferred)", pillar: "Be seen", budgetK: 0, payment: "Upfront",
    costControl: "Deferred. Nothing spent in these 6 months.",
    measure: "Revisit after three months of cost per sign-up from QR, email and contests",
    watch: "Metro ads in every city are far beyond this budget" },
  { id: 6, name: "Email and push", pillar: "Be seen", budgetK: 3, payment: "Upfront",
    costControl: "Free tiers of an email tool and web push.",
    measure: "8K subscribers, open and click rates, return visits within 7 days",
    watch: "One-click unsubscribe and clear consent at sign-up" },
  { id: 7, name: "Student ambassadors", pillar: "Build the community", budgetK: 25, payment: "Pay on result",
    costControl: "Digital rewards first. Physical goodies only for the top 20. Paid on verified sign-ups.",
    measure: "100 ambassadors, 25 colleges, 4K referred sign-ups",
    watch: "Reward only verified sign-ups" },
  { id: 8, name: "Day 1 prediction prizes", pillar: "Contests and intelligence", budgetK: 15, payment: "Pay on result",
    costControl: "Tickets and coupons from partners. Small cash prize. Three contests.",
    measure: "2,000 entries per tentpole, share of entrants who are new",
    watch: "Free entry, clear rules, legal review before launch" },
  { id: 9, name: "Critics bonuses and payouts", pillar: "Build the community", budgetK: 50, payment: "Pay on result",
    costControl: "Capped at 50 critics in two batches. Cash leaves only at a ₹1,000 balance.",
    measure: "50 activated critics, cost per approved review",
    watch: 'Visible "incentivised" label and a quality bar' },
  { id: 10, name: "Critic of the Month", pillar: "Build the community", budgetK: 10, payment: "Pay on result",
    costControl: "₹2,000 a month from month 2. Featured placement is free.",
    measure: "Votes cast, sign-ups from voters, winner referral traffic",
    watch: "One vote per verified, logged-in account" },
  { id: 11, name: "MiroFish", pillar: "Contests and intelligence", budgetK: 5, payment: "Upfront",
    costControl: "Cheap model, under 40 simulation rounds, one pilot.",
    measure: "One pilot on an upcoming release, compared with real reactions",
    watch: "Not a load tester; keep synthetic users off the live site" },
  { id: 12, name: "Short film contest", pillar: "Contests and intelligence", budgetK: 15, payment: "Pay on result",
    costControl: "₹10,000 and ₹5,000 prizes. Seek a sponsor to cover them.",
    measure: "50 submissions, sign-ups from login-gated likes and comments",
    watch: "Count unique logged-in viewers; takedown process for disputes" },
];

export const goals: Goal[] = [
  { goal: "Registered users", target: 50000, label: "50K", detail: "About ₹3 of cash per user" },
  { goal: "Reviews", target: 20000, label: "20K", detail: "From critics, ambassadors and contest leaderboards" },
  { goal: "Activated critics", target: 50, label: "50", detail: "Activated at 50 approved reviews; capped at 50" },
  { goal: "Organic share of sign-ups", target: 80, label: "80%+", detail: "Search, AI answers, referrals and channel links" },
  { goal: "Search rank for box office queries", target: 5, label: "Top 5", detail: "For 70% of new releases within 7 days" },
  { goal: "Entries per tentpole prediction", target: 2000, label: "2,000", detail: "Login required, so each entry is a user" },
  { goal: "Student ambassadors", target: 100, label: "100", detail: "Across about 25 colleges" },
  { goal: "Email subscribers", target: 8000, label: "8K", detail: "Weekly box office report as the hook" },
];

export const phases: Phase[] = [
  { phase: 1, period: "Months 1–2", name: "Foundations", activities: [
    { initiativeId: 1, activity: "Movie pages, schema markup and answer blocks live" },
    { initiativeId: 3, activity: "Channel database built" },
    { initiativeId: 2, activity: "Own-page bots and the approval queue" },
    { initiativeId: 9, activity: "First batch of 25 critics onboarded" },
    { initiativeId: 6, activity: "Weekly report email starts" },
    { initiativeId: 4, activity: "First QR placements in colleges and a few theatres" },
    { initiativeId: 11, activity: "MiroFish pilot set up" },
  ] },
  { phase: 2, period: "Months 3–4", name: "Contests and campuses", activities: [
    { initiativeId: 7, activity: "Student ambassadors recruited" },
    { initiativeId: 8, activity: "First Day 1 prediction contest on a major release" },
    { initiativeId: 10, activity: "Critic of the Month begins" },
    { initiativeId: 12, activity: "Short film contest runs for one month" },
    { initiativeId: 3, activity: "Channel partnerships by barter" },
  ] },
  { phase: 3, period: "Months 5–6", name: "Scale what worked", activities: [
    { initiativeId: 9, activity: "Second batch of 25 critics, if first batch quality holds" },
    { initiativeId: 4, activity: "More QR placements where scans convert" },
    { initiativeId: 8, activity: "Second and third prediction contests" },
    { initiativeId: 5, activity: "Review every channel by cost per sign-up and decide on metro" },
  ] },
];

export const payouts: PayoutRule[] = [
  { item: "Joining bonus", rule: "Credited at sign-up", value: 500, unit: "₹" },
  { item: "Cash-out threshold", rule: "Balance must reach this before a bank withdrawal", value: 1000, unit: "₹" },
  { item: "New movie review", rule: "Movie under 1 month old", value: 10, unit: "pts" },
  { item: "Older movie review", rule: "Movie over 1 month old", value: 10, unit: "pts" },
  { item: "Referral", rule: "Per account sign-up", value: 5, unit: "pts" },
  { item: "Fastest route to ₹1,000", rule: "10 new + 40 older reviews = 500 pts", value: 50, unit: "reviews" },
  { item: "Referral-only route", rule: "500 pts at 5 per sign-up", value: 100, unit: "sign-ups" },
  { item: "Maximum cost per critic", rule: "₹500 bonus + ₹500 earned", value: 1000, unit: "₹" },
];

export const decisions: Decision[] = [
  { topic: "Cash cap", question: "Is about ₹1.6L the right ceiling? Prizes are the easiest line to trim.", status: "Open" },
  { topic: "Team time", question: "Who builds the movie pages, runs the bots and handles outreach?", status: "Open" },
  { topic: "Prize partners", question: "A theatre or ticketing partner for tickets, and a sponsor for short film prizes.", status: "Open" },
  { topic: "GEO", question: "Being cited by AI assistants, or location-based search? The second shifts the plan to city pages.", status: "Open" },
  { topic: "Points", question: "Confirm 1 point = ₹1 for critic payouts.", status: "Open" },
  { topic: "Bots", question: "Is the approval queue on other pages' comments acceptable under platform rules?", status: "Open" },
  { topic: "Legal check", question: "Prediction and short film contests with cash prizes need review before launch.", status: "Open" },
];

// ---- Derived figures. Everything below is worked out from the tables above,
// so editing a budget line or goal updates every total on the page.

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const goalTarget = (name: string) => goals.find((g) => g.goal === name)?.target ?? 0;
const payoutValue = (item: string) => payouts.find((p) => p.item === item)?.value ?? 0;

export function budgetSummary() {
  const totalK = sum(initiatives.map((i) => i.budgetK));
  const onResultK = sum(initiatives.filter((i) => i.payment === "Pay on result").map((i) => i.budgetK));
  const top = [...initiatives].sort((a, b) => b.budgetK - a.budgetK)[0];
  const userGoal = goalTarget("Registered users");
  return {
    totalK,
    onResultK,
    upfrontK: totalK - onResultK,
    onResultPct: totalK ? Math.round((onResultK / totalK) * 100) : 0,
    top,
    userGoal,
    cashPerUser: userGoal ? (totalK * 1000) / userGoal : 0,
  };
}

export function sharePct(budgetK: number) {
  const totalK = sum(initiatives.map((i) => i.budgetK));
  return totalK ? Math.round((budgetK / totalK) * 1000) / 10 : 0;
}

export function pillarTotals() {
  return PILLARS.map((pillar) => {
    const rows = initiatives.filter((i) => i.pillar === pillar);
    const budgetK = sum(rows.map((r) => r.budgetK));
    return { pillar, initiatives: rows.length, budgetK, sharePct: sharePct(budgetK) };
  });
}

export function criticEconomics() {
  const maxCost = payoutValue("Maximum cost per critic");
  const reviews = payoutValue("Fastest route to ₹1,000");
  const critics = goalTarget("Activated critics");
  return {
    maxCost,
    reviews,
    costPerReview: reviews ? Math.round(maxCost / reviews) : 0,
    critics,
    payoutCapK: (critics * maxCost) / 1000,
  };
}

export const inr = (n: number) => n.toLocaleString("en-IN");
export const lakh = (thousands: number) => (thousands / 100).toFixed(2);
