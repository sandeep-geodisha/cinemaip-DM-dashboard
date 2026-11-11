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

export type PlanActivity = {
  initiativeId: number;
  /** Task title. */
  activity: string;
  /** One line shown on the task card. */
  summary: string;
  steps: string[];
  doneWhen: string;
  /** What this stage is judged on. */
  measure: string;
  /** This stage's share of the budget, when the initiative has more than one stage. */
  budget?: string;
  watch: string;
  /** Decisions (by topic) that must be made first. */
  needs?: string[];
};

export type Phase = {
  phase: 1 | 2 | 3;
  period: string;
  name: string;
  activities: PlanActivity[];
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
    costControl: "Low-cost model, under 40 simulation rounds, one pilot.",
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

// Each calendar activity is one task on the board. Its brief is specific to
// that stage of the work, so no two tasks repeat the same content.
const act = (a: PlanActivity) => a;

export const phases: Phase[] = [
  { phase: 1, period: "Months 1–2", name: "Foundations", activities: [
    act({ initiativeId: 1, activity: "Movie pages, schema markup and answer blocks live",
      summary: "Launch movie pages that rank for box office searches and get quoted by AI assistants.",
      steps: [
        "Build a server-rendered page for every current release: day-wise collections, reviews, cast and where to stream.",
        "Add schema markup (movie, review, FAQ) in code and check it in Search Console.",
        "Put a short answer block at the top of each page that answers \"[movie] box office collection\" in one or two sentences.",
        "Show the source and date next to every collection figure.",
        "Start a weekly check of whether AI assistants cite CinemaIP pages.",
      ],
      doneWhen: "Every current release has a live page whose schema passes validation, and the first weekly AI citation check is logged.",
      measure: "Top 5 for \"[movie] box office collection\" within 7 days of release, on 70% of new releases; AI citations each week.",
      watch: "Pages must be readable without JavaScript. If GEO turns out to mean location search, city pages are added.",
      needs: ["GEO", "Team time"] }),
    act({ initiativeId: 3, activity: "Channel database built",
      summary: "Map 600 entertainment pages and channels, and decide how to approach each one.",
      steps: [
        "List YouTube, Instagram, Facebook and X entertainment pages using official APIs and public data.",
        "Record for each: platform, followers, language, region and how to contact them.",
        "Tier each one: partnership, bot reply, or email outreach.",
        "Keep everything in one shared sheet the team can update.",
      ],
      doneWhen: "600 channels are in the database, each with a tier and a contact route.",
      measure: "600 channels mapped and tiered.",
      watch: "Official APIs and public data only; no scraping behind logins.",
      needs: ["Team time"] }),
    act({ initiativeId: 2, activity: "Own-page bots and the approval queue",
      summary: "Automate replies and DMs on our own pages, and queue comments for other pages for a person to approve.",
      steps: [
        "Connect CinemaIP's own Instagram, Facebook and X accounts through the official APIs.",
        "Turn on automatic replies and DMs on our own posts, linking to the matching movie page.",
        "Send drafted comments for other pages to an approval queue; nothing posts until a person approves it.",
        "Set a daily rate cap per platform.",
        "Tag every link so clicks and sign-ups are counted per platform.",
      ],
      doneWhen: "Bots reply on our own pages, the approval queue is used daily, and link tracking reports by platform.",
      measure: "Link clicks and sign-ups per 100 comments, per platform.",
      watch: "Fully automatic link comments on other pages break Meta and X rules.",
      needs: ["Bots", "Team time"] }),
    act({ initiativeId: 9, activity: "First batch of 25 critics onboarded",
      summary: "Bring in the first 25 paid critics, with a guide, a review template and moderation in place.",
      steps: [
        "Publish the onboarding guide and the review template.",
        "Set up moderation: a review earns points only after it is approved.",
        "Collect bank details and PAN before a critic's first cash-out.",
        "Show an \"incentivised\" label on paid critics' reviews.",
        "Recruit and onboard 25 critics; one review per critic per movie.",
      ],
      doneWhen: "25 critics are onboarded and moderation is approving their reviews.",
      measure: "Approved reviews per critic, and cost per approved review (about ₹20 at the ₹1,000 cap).",
      budget: "Up to ₹25K of the ₹50K critics line (25 critics × ₹1,000 at most), paid only on result.",
      watch: "Hold the quality bar from the first review; points count only for approved reviews.",
      needs: ["Points"] }),
    act({ initiativeId: 6, activity: "Weekly report email starts",
      summary: "Send a box office report every Monday and a push on release days, on free-tier tools.",
      steps: [
        "Pick a free-tier email tool and web push service.",
        "Add an email opt-in with clear consent at sign-up and on movie pages.",
        "Send the weekly box office report every Monday.",
        "Send a push on release days for the week's big films.",
        "Put one-click unsubscribe in every email.",
      ],
      doneWhen: "The first Monday report has gone out and release-day push is working.",
      measure: "Subscribers (8K by month 6), open and click rates, return visits within 7 days.",
      watch: "One-click unsubscribe and clear consent." }),
    act({ initiativeId: 4, activity: "First QR placements in colleges and a few theatres",
      summary: "Place tracked QR codes in colleges and a few theatres to learn which places bring sign-ups.",
      steps: [
        "Create a dynamic QR code for each placement that opens the current film's page.",
        "Print a few hundred small posters.",
        "Get venue permission before placing anything.",
        "Start with colleges, through ambassadors as they join, then a few theatres.",
        "Report scans and sign-ups for each placement.",
      ],
      doneWhen: "Codes are live in the first colleges and theatres, with scans and sign-ups reported per placement.",
      measure: "Scans and sign-ups per placement; cost per sign-up.",
      watch: "Venue permission first, and a schedule for refreshing posters." }),
    act({ initiativeId: 11, activity: "MiroFish pilot set up",
      summary: "Set up the MiroFish simulation tool and test it once against a real release.",
      steps: [
        "Install MiroFish (an open-source agent simulation tool on GitHub) and add an LLM key.",
        "Pilot: predict how audiences will react to an upcoming trailer or synopsis.",
        "If time allows, also test sign-up and review flows on a staging copy, and test campaign messages.",
        "Stay under 40 simulation rounds on a low-cost model.",
        "After release, compare the prediction with real reactions.",
      ],
      doneWhen: "One pilot has run and its prediction has been compared with real reactions after release.",
      measure: "How closely the prediction matched real audience reactions.",
      watch: "It simulates social conversation, not site load; keep synthetic users off the live site." }),
  ] },
  { phase: 2, period: "Months 3–4", name: "Contests and campuses", activities: [
    act({ initiativeId: 7, activity: "Student ambassadors recruited",
      summary: "Recruit 100 student ambassadors across about 25 colleges, rewarded only for verified sign-ups.",
      steps: [
        "Open an application form and choose ambassadors college by college.",
        "Send each one a welcome pack and a personal referral code.",
        "Set digital rewards at sign-up milestones; physical rewards only for the top 20.",
        "Publish a leaderboard every month.",
        "Use ambassadors to place and look after college QR codes.",
      ],
      doneWhen: "Ambassadors are active in about 25 colleges, each with a working referral code.",
      measure: "100 ambassadors, 25 colleges, 4K referred sign-ups.",
      watch: "Reward verified sign-ups only." }),
    act({ initiativeId: 8, activity: "First Day 1 prediction contest on a major release",
      summary: "Run the first free prediction contest on a big release, with entries locked before the first show.",
      steps: [
        "Pick a major release.",
        "Publish clear rules; entry is free and needs a login.",
        "Lock predictions before the first show.",
        "Announce winners once the verified Day 1 collection is published.",
        "Give tickets and coupons from partners, plus a small cash prize.",
      ],
      doneWhen: "The contest has run and winners are announced from the verified collection figure.",
      measure: "2,000 entries; share of entrants who are new to CinemaIP.",
      budget: "About ₹5K of the ₹15K prediction prizes line (three contests), paid only on result.",
      watch: "Free entry and clear rules; the cash prize needs the legal review first.",
      needs: ["Legal check", "Prize partners"] }),
    act({ initiativeId: 10, activity: "Critic of the Month begins",
      summary: "Start a monthly public vote that features the best critic and pays the winner ₹2,000.",
      steps: [
        "Shortlist the top 5 critics each month on review quality.",
        "Open a public vote: one vote per verified, logged-in account.",
        "Feature the winner on the site and pay ₹2,000.",
        "Track sign-ups from voters and referral traffic to the winner's reviews.",
      ],
      doneWhen: "The first month's winner is announced, featured and paid.",
      measure: "Votes cast, sign-ups from voters, referral traffic from the winner.",
      watch: "Shortlist on quality, not on the number of reviews." }),
    act({ initiativeId: 12, activity: "Short film contest runs for one month",
      summary: "Run a one-month short film contest where likes and comments need a login.",
      steps: [
        "Publish the rules: older films are allowed with signed proof of ownership.",
        "Open submissions for one month.",
        "Make likes and comments login-only.",
        "Shortlist the top 5 by views, likes and comments; judges pick the top 2.",
        "Pay ₹10,000 and ₹5,000, ideally covered by a sponsor.",
        "Set up a takedown process for disputes.",
      ],
      doneWhen: "Winners are announced and both prizes are paid.",
      measure: "50 submissions; sign-ups from login-only likes and comments.",
      watch: "Count unique logged-in viewers, not raw views.",
      needs: ["Legal check", "Prize partners"] }),
    act({ initiativeId: 3, activity: "Channel partnerships by barter",
      summary: "Turn the best-fit channels from the database into partnerships, paid in barter rather than fees.",
      steps: [
        "Take the partnership tier from the channel database.",
        "Offer barter: box office data, graphics or featured placement in return for mentions and links.",
        "Log each conversation and its outcome in the database.",
        "Give each partner a tracked link.",
      ],
      doneWhen: "50 channels are in active conversation and the first partnerships are live.",
      measure: "50 channels in conversation; sign-ups per partner link.",
      watch: "No cash fees; official APIs and public data only." }),
  ] },
  { phase: 3, period: "Months 5–6", name: "Scale what worked", activities: [
    act({ initiativeId: 9, activity: "Second batch of 25 critics, if first batch quality holds",
      summary: "Add 25 more critics only if the first batch's quality and cost per review held up.",
      steps: [
        "Review the first batch: approval rate, review quality and cost per approved review.",
        "If it held up, onboard 25 more critics with the same guide and moderation.",
        "If not, fix the guide or the quality bar before adding anyone.",
      ],
      doneWhen: "A go or no-go is recorded; on go, 25 more critics are onboarded (50 in total).",
      measure: "50 activated critics; cost per approved review.",
      budget: "Up to ₹25K, the rest of the ₹50K critics line, paid only on result.",
      watch: "The cap stays at 50 critics." }),
    act({ initiativeId: 4, activity: "More QR placements where scans convert",
      summary: "Add QR codes only in the kinds of places that brought sign-ups in Act I.",
      steps: [
        "Rank the Act I placements by sign-ups and cost per sign-up.",
        "Remove placements that didn't convert.",
        "Add placements in places like the ones that did, and refresh their posters.",
      ],
      doneWhen: "New codes are live only where scans converted, and the weak placements are gone.",
      measure: "Cost per sign-up compared with Act I.",
      watch: "Venue permission for every new placement." }),
    act({ initiativeId: 8, activity: "Second and third prediction contests",
      summary: "Run two more prediction contests, improved by what the first one taught us.",
      steps: [
        "Review the first contest: entries, new entrants and anything that went wrong.",
        "Pick two tentpole releases.",
        "Run each one the same way: free entry, entries locked before the first show, winners after the verified collection.",
      ],
      doneWhen: "Both contests have run and their winners are announced.",
      measure: "2,000 entries per contest; share of new entrants.",
      budget: "About ₹10K, the rest of the ₹15K prediction prizes line, paid only on result.",
      watch: "Keep the rules the legal review approved." }),
    act({ initiativeId: 5, activity: "Review every channel by cost per sign-up and decide on metro",
      summary: "Compare every channel's cost per sign-up and decide whether metro ads are worth a pilot.",
      steps: [
        "Pull sign-ups and cost per sign-up for search, bots, channels, QR, email, ambassadors, contests and critics.",
        "Rank the channels and recommend where the next budget should go.",
        "Get one free quote for metro ads.",
        "Decide: no metro ads, or a pilot in one city.",
      ],
      doneWhen: "The channel review is shared with the team and the metro decision is recorded.",
      measure: "Cost per sign-up for each channel.",
      budget: "₹0 in these six months; a metro pilot would need new budget.",
      watch: "Metro ads in every city are far beyond this budget." }),
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
